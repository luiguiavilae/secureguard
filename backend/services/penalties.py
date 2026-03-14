"""
services/penalties.py — Engine de penalizaciones y scores para SecureGuard.

Todo funciona en modo mock: las llamadas a Supabase se abstraen tras get_supabase()
y se pueden mockear en tests. Stripe se invoca a través de services.stripe
que ya tiene su propio modo mock.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── Niveles de score ──────────────────────────────────────────────────────────

NIVELES = [
    (80, 100, "CONFIABLE", "🟢"),
    (50, 79, "REGULAR", "🟡"),
    (20, 49, "OBSERVADO", "🟠"),
    (0, 19, "RESTRINGIDO", "🔴"),
]


def _calcular_nivel(score: float) -> tuple[str, str]:
    """Retorna (nombre_nivel, emoji) para el score dado."""
    if score < 0:
        return "BLOQUEADO", "⛔"
    for low, high, nombre, emoji in NIVELES:
        if low <= score <= high:
            return nombre, emoji
    return "BLOQUEADO", "⛔"


# ── apply_score_delta ─────────────────────────────────────────────────────────

def apply_score_delta(
    user_id: str,
    delta: float,
    motivo: str,
    service_id: Optional[str] = None,
    db=None,
) -> dict:
    """
    Actualiza el score del usuario, recalcula su nivel y aplica restricciones
    si corresponde.

    En modo mock (db=None) opera sobre score base 100 y retorna el resultado
    calculado sin persistir nada.

    Retorna:
        { nuevo_score, nivel_anterior, nuevo_nivel, emoji, cambio_estado }
    """
    if db is None:
        score_actual = 100.0
        nivel_anterior, _ = _calcular_nivel(score_actual)
        nuevo_score = score_actual + delta
        nuevo_nivel, emoji = _calcular_nivel(nuevo_score)
        cambio_estado = None

        if nuevo_score < 0 and nivel_anterior != "BLOQUEADO":
            cambio_estado = "BLOQUEADO"
        elif nuevo_nivel == "OBSERVADO" and nivel_anterior not in ("OBSERVADO", "RESTRINGIDO", "BLOQUEADO"):
            cambio_estado = "OBSERVADO"
        elif nuevo_nivel == "RESTRINGIDO" and nivel_anterior not in ("RESTRINGIDO", "BLOQUEADO"):
            cambio_estado = "RESTRINGIDO"

        logger.info(
            f"[SCORE MOCK] user={user_id} delta={delta:+.0f} "
            f"nuevo={nuevo_score:.0f} nivel={nuevo_nivel} motivo={motivo}"
        )
        return {
            "nuevo_score": nuevo_score,
            "nivel_anterior": nivel_anterior,
            "nuevo_nivel": nuevo_nivel,
            "emoji": emoji,
            "cambio_estado": cambio_estado,
        }

    # ── Con Supabase real ────────────────────────────────────────────────────
    result = (
        db.table("agent_profiles")
        .select("score, nivel")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        result = (
            db.table("client_profiles")
            .select("score")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

    score_actual = float((result.data[0].get("score") or 100) if result.data else 100)
    nivel_anterior, _ = _calcular_nivel(score_actual)

    nuevo_score = score_actual + delta
    nuevo_nivel, emoji = _calcular_nivel(nuevo_score)
    cambio_estado = None

    db.table("agent_profiles").update(
        {"score": nuevo_score, "nivel": nuevo_nivel}
    ).eq("user_id", user_id).execute()

    if nuevo_score < 0 and nivel_anterior != "BLOQUEADO":
        cambio_estado = "BLOQUEADO"
        db.table("users").update({"estado": "BLOQUEADO"}).eq("id", user_id).execute()
        logger.warning(f"⛔ [SCORE] Usuario {user_id} BLOQUEADO — score negativo")
    elif nuevo_nivel == "OBSERVADO" and nivel_anterior not in ("OBSERVADO", "RESTRINGIDO", "BLOQUEADO"):
        cambio_estado = "OBSERVADO"
        logger.info(f"🟠 [SCORE] Usuario {user_id} → OBSERVADO (pago anticipado obligatorio)")
    elif nuevo_nivel == "RESTRINGIDO" and nivel_anterior not in ("RESTRINGIDO", "BLOQUEADO"):
        cambio_estado = "RESTRINGIDO"
        logger.warning(f"🔴 [SCORE] Usuario {user_id} → RESTRINGIDO")

    db.table("user_scores").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "delta": delta,
        "score_resultante": nuevo_score,
        "nivel_resultante": nuevo_nivel,
        "motivo": motivo,
        "service_id": service_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    logger.info(
        f"[SCORE] user={user_id} delta={delta:+.0f} "
        f"{nivel_anterior}→{nuevo_nivel} nuevo_score={nuevo_score:.0f}"
    )

    return {
        "nuevo_score": nuevo_score,
        "nivel_anterior": nivel_anterior,
        "nuevo_nivel": nuevo_nivel,
        "emoji": emoji,
        "cambio_estado": cambio_estado,
    }


# ── cancel_service ────────────────────────────────────────────────────────────

def cancel_service(
    service_id: str,
    cancelled_by: str,
    motivo: str,
    db=None,
    service_data: Optional[dict] = None,
) -> dict:
    """
    Procesa la cancelación de un servicio aplicando penalizaciones según quién
    cancela y en qué momento.

    Retorna:
        {
            penalidad_aplicada, monto_reembolso, monto_retenido,
            nuevo_score, nuevo_nivel, suspension_dias, compensacion_cliente,
            refund_id,
        }
    """
    from services.stripe import create_refund

    if service_data is None:
        if db is None:
            raise ValueError("Se requiere db o service_data en modo real")
        result = (
            db.table("services")
            .select("*")
            .eq("id", service_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Servicio {service_id} no encontrado")
        service_data = result.data[0]

    precio_total: float = float(service_data.get("precio_total") or 0)
    cliente_id: str = service_data.get("cliente_id", "")
    agente_id: str = (
        service_data.get("agente_asignado_id")
        or service_data.get("agente_seleccionado_id")
        or ""
    )
    estado: str = service_data.get("estado", "CONFIRMADO")

    # Calcular minutos hasta el inicio
    fecha_inicio_str = service_data.get("fecha_inicio_solicitada") or service_data.get("fecha_inicio")
    minutos_hasta_inicio: float = float("inf")

    if fecha_inicio_str:
        try:
            if isinstance(fecha_inicio_str, str):
                from dateutil import parser as dtparser
                fecha_inicio = dtparser.parse(fecha_inicio_str)
                if fecha_inicio.tzinfo is None:
                    fecha_inicio = fecha_inicio.replace(tzinfo=timezone.utc)
            else:
                fecha_inicio = fecha_inicio_str
            now = datetime.now(timezone.utc)
            minutos_hasta_inicio = (fecha_inicio - now).total_seconds() / 60
        except Exception:
            minutos_hasta_inicio = float("inf")

    ya_iniciado = estado == "EN_CURSO" or minutos_hasta_inicio < 0

    cancela_cliente = (cancelled_by == cliente_id)
    cancela_agente = (cancelled_by == agente_id)

    monto_reembolso: float = 0.0
    monto_retenido: float = 0.0
    score_delta: float = 0.0
    suspension_dias: int = 0
    compensacion_cliente: float = 0.0
    penalidad_aplicada: str = ""

    # ── Reglas cliente ───────────────────────────────────────────────────────
    if cancela_cliente:
        if ya_iniciado:
            pct_reembolso = 0.0
            score_delta = -10.0
            penalidad_aplicada = "CANCELACION_CLIENTE_SERVICIO_INICIADO"
        elif minutos_hasta_inicio < 60:
            pct_reembolso = 0.0
            score_delta = -10.0
            penalidad_aplicada = "CANCELACION_CLIENTE_MENOS_1H"
        elif minutos_hasta_inicio <= 180:
            pct_reembolso = 0.50
            score_delta = -5.0
            penalidad_aplicada = "CANCELACION_CLIENTE_1H_3H"
        else:
            pct_reembolso = 0.75
            score_delta = 0.0
            penalidad_aplicada = "CANCELACION_CLIENTE_MAS_1H"

        monto_reembolso = round(precio_total * pct_reembolso, 2)
        monto_retenido = round(precio_total - monto_reembolso, 2)

        logger.info(
            f"[PENALTY] Cancelación CLIENTE svc={service_id} "
            f"reembolso={monto_reembolso:.2f} retenido={monto_retenido:.2f} "
            f"penalidad={penalidad_aplicada}"
        )

    # ── Reglas agente ────────────────────────────────────────────────────────
    elif cancela_agente:
        if minutos_hasta_inicio > 120:
            score_delta = -15.0
            compensacion_cliente = 20.0
            monto_reembolso = precio_total
            penalidad_aplicada = "CANCELACION_AGENTE_MAS_2H"
        else:
            score_delta = -25.0
            suspension_dias = 7
            monto_reembolso = precio_total
            penalidad_aplicada = "CANCELACION_AGENTE_MENOS_2H"

        monto_retenido = 0.0
        logger.info(
            f"[PENALTY] Cancelación AGENTE svc={service_id} "
            f"delta_score={score_delta:+.0f} suspension={suspension_dias}d "
            f"penalidad={penalidad_aplicada}"
        )

    else:
        penalidad_aplicada = "CANCELACION_ADMIN"
        monto_reembolso = precio_total

    # ── Ejecutar reembolso ───────────────────────────────────────────────────
    stripe_pi = service_data.get("stripe_payment_intent_id")
    refund_result = None

    if monto_reembolso > 0 and stripe_pi:
        amount_cents = int(monto_reembolso * 100)
        refund_result = create_refund(stripe_pi, amount_cents)
        logger.info(f"[PENALTY] Reembolso ejecutado: {refund_result}")
    elif monto_reembolso > 0:
        logger.info(
            f"[PENALTY] Reembolso manual pendiente S/. {monto_reembolso:.2f} "
            f"para svc={service_id}"
        )

    # ── Actualizar score ─────────────────────────────────────────────────────
    score_result = None
    score_target_id = agente_id if cancela_agente else cliente_id

    if score_delta != 0 and score_target_id:
        score_result = apply_score_delta(
            user_id=score_target_id,
            delta=score_delta,
            motivo=penalidad_aplicada,
            service_id=service_id,
            db=db,
        )

    # ── Suspender agente si aplica ───────────────────────────────────────────
    if suspension_dias > 0 and agente_id and db is not None:
        from datetime import timedelta
        suspension_hasta = (
            datetime.now(timezone.utc) + timedelta(days=suspension_dias)
        ).isoformat()
        db.table("agent_profiles").update(
            {"status": "suspended", "suspension_hasta": suspension_hasta}
        ).eq("user_id", agente_id).execute()
        logger.warning(f"🚫 [PENALTY] Agente {agente_id} suspendido {suspension_dias} días")

    # ── Persistir cambios ────────────────────────────────────────────────────
    if db is not None:
        db.table("services").update(
            {"estado": "CANCELADO", "motivo_cancelacion": motivo}
        ).eq("id", service_id).execute()

        db.table("service_events").insert({
            "id": str(uuid.uuid4()),
            "service_id": service_id,
            "tipo": "CANCELACION",
            "descripcion": f"Cancelado por {cancelled_by}: {penalidad_aplicada}",
            "actor_id": cancelled_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

    return {
        "penalidad_aplicada": penalidad_aplicada,
        "monto_reembolso": monto_reembolso,
        "monto_retenido": monto_retenido,
        "nuevo_score": score_result["nuevo_score"] if score_result else None,
        "nuevo_nivel": score_result["nuevo_nivel"] if score_result else None,
        "suspension_dias": suspension_dias,
        "compensacion_cliente": compensacion_cliente,
        "refund_id": refund_result.get("id") if refund_result else None,
    }


# ── Timeout por no presentación ───────────────────────────────────────────────

def apply_timeout_penalty(
    service_id: str,
    agente_id: str,
    db=None,
) -> dict:
    """
    Penalidad máxima por no presentación: -50 pts + suspensión 30 días.
    Llamada desde check_agent_timeout.
    """
    score_result = apply_score_delta(
        user_id=agente_id,
        delta=-50.0,
        motivo="NO_PRESENTACION_TIMEOUT",
        service_id=service_id,
        db=db,
    )

    if db is not None:
        from datetime import timedelta
        suspension_hasta = (
            datetime.now(timezone.utc) + timedelta(days=30)
        ).isoformat()
        db.table("agent_profiles").update(
            {"status": "suspended", "suspension_hasta": suspension_hasta}
        ).eq("user_id", agente_id).execute()

        db.table("service_events").insert({
            "id": str(uuid.uuid4()),
            "service_id": service_id,
            "tipo": "TIMEOUT_AGENTE",
            "descripcion": "Agente no se presentó — penalidad máxima aplicada",
            "actor_id": agente_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        db.table("services").update(
            {"estado": "ABIERTA", "agente_asignado_id": None}
        ).eq("id", service_id).execute()

    logger.warning(
        f"⏰ [PENALTY] Timeout agente={agente_id} svc={service_id} "
        f"→ -50 pts + 30 días suspensión"
    )

    return {
        **score_result,
        "suspension_dias": 30,
        "penalidad_aplicada": "NO_PRESENTACION_TIMEOUT",
    }
