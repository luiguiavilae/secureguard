"""
services/badges.py — Engine de badges y comisiones para agentes SecureGuard.
Funciona en modo mock (db=None) para tests unitarios.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

BADGE_CATALOG: dict[str, dict] = {
    "puntual": {"nombre": "Puntual", "emoji": "⏰", "categoria": "PUNTUALIDAD", "descripcion": "5 servicios sin retraso", "comision_pct": 0},
    "siempre_a_tiempo": {"nombre": "Siempre a Tiempo", "emoji": "⏰⏰", "categoria": "PUNTUALIDAD", "descripcion": "20 servicios sin retraso", "comision_pct": 2},
    "reloj_suizo": {"nombre": "Reloj Suizo", "emoji": "⌚", "categoria": "PUNTUALIDAD", "descripcion": "50 servicios sin retraso", "comision_pct": 3},
    "bien_valorado": {"nombre": "Bien Valorado", "emoji": "👍", "categoria": "RATING", "descripcion": "Rating ≥4.5 en 10 servicios", "comision_pct": 0},
    "excelencia": {"nombre": "Excelencia", "emoji": "🌟", "categoria": "RATING", "descripcion": "Rating ≥4.8 en 30 servicios", "comision_pct": 0},
    "diamante": {"nombre": "Diamante", "emoji": "💎", "categoria": "RATING", "descripcion": "Rating ≥4.9 en 100 servicios", "comision_pct": 5},
    "despegue": {"nombre": "Despegue", "emoji": "🚀", "categoria": "VOLUMEN", "descripcion": "Primer servicio completado", "comision_pct": 0},
    "activo": {"nombre": "Activo", "emoji": "💪", "categoria": "VOLUMEN", "descripcion": "10 servicios completados", "comision_pct": 0},
    "veterano": {"nombre": "Veterano", "emoji": "🔟", "categoria": "VOLUMEN", "descripcion": "50 servicios completados", "comision_pct": 0},
    "centurion": {"nombre": "Centurión", "emoji": "🏆", "categoria": "VOLUMEN", "descripcion": "100 servicios completados", "comision_pct": 4},
    "leyenda": {"nombre": "Leyenda", "emoji": "👑", "categoria": "VOLUMEN", "descripcion": "500 servicios completados", "comision_pct": 0},
    "cero_cancelaciones": {"nombre": "Cero Cancelaciones", "emoji": "🎯", "categoria": "COMPROMISO", "descripcion": "20 servicios sin cancelar", "comision_pct": 0},
    "confiable": {"nombre": "Confiable", "emoji": "🛡️", "categoria": "COMPROMISO", "descripcion": "50 servicios sin cancelar", "comision_pct": 0},
    "residencial": {"nombre": "Especialista Residencial", "emoji": "🏠", "categoria": "ESPECIALIZACION", "descripcion": "20 servicios residenciales", "comision_pct": 0},
    "eventos": {"nombre": "Especialista Eventos", "emoji": "🎪", "categoria": "ESPECIALIZACION", "descripcion": "20 servicios de eventos", "comision_pct": 0},
    "comercial": {"nombre": "Especialista Comercial", "emoji": "🏢", "categoria": "ESPECIALIZACION", "descripcion": "20 servicios comerciales", "comision_pct": 0},
    "escolta": {"nombre": "Especialista Escolta", "emoji": "🕴️", "categoria": "ESPECIALIZACION", "descripcion": "20 servicios de escolta", "comision_pct": 0},
    "custodia": {"nombre": "Especialista Custodia", "emoji": "🔒", "categoria": "ESPECIALIZACION", "descripcion": "20 servicios de custodia", "comision_pct": 0},
}

BASE_COMISION_PCT = 20


def _calcular_comision(badges_activos: list[str]) -> int:
    """Leyenda → comisión fija 8%. Resto → 20% menos descuentos, mínimo 5%."""
    if "leyenda" in badges_activos:
        return 8
    descuento = sum(BADGE_CATALOG[b]["comision_pct"] for b in badges_activos if b in BADGE_CATALOG)
    return max(BASE_COMISION_PCT - descuento, 5)


def evaluate_badges(
    agent_id: str,
    db=None,
    agent_stats: Optional[dict] = None,
) -> dict:
    """
    Evalúa y otorga badges a un agente.

    En modo mock (db=None) requiere agent_stats:
        completed_services, rating_avg, rating_count,
        servicios_sin_retraso, servicios_sin_cancelacion,
        tipos_servicio: dict[str, int],
        badges_actuales: list[str]

    Retorna: { badges_nuevos, nueva_comision, badges_totales }
    """
    if agent_stats is None:
        if db is None:
            raise ValueError("Se requiere db o agent_stats")
        res = (
            db.table("agent_profiles")
            .select("completed_services, rating_avg, rating_count, "
                    "servicios_sin_retraso, servicios_sin_cancelacion, tipos_servicio")
            .eq("id", agent_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise ValueError(f"Agente {agent_id} no encontrado")
        agent_stats = res.data[0]

    completed = int(agent_stats.get("completed_services") or 0)
    rating_avg = float(agent_stats.get("rating_avg") or 0.0)
    rating_count = int(agent_stats.get("rating_count") or 0)
    sin_retraso = int(agent_stats.get("servicios_sin_retraso") or 0)
    sin_cancelacion = int(agent_stats.get("servicios_sin_cancelacion") or 0)
    tipos: dict[str, int] = agent_stats.get("tipos_servicio") or {}

    if db is not None:
        badges_res = db.table("agent_badges").select("badge").eq("agent_id", agent_id).execute()
        badges_actuales: set[str] = {b["badge"] for b in (badges_res.data or [])}
    else:
        badges_actuales = set(agent_stats.get("badges_actuales") or [])

    candidatos: list[str] = []

    # Puntualidad
    if sin_retraso >= 5:
        candidatos.append("puntual")
    if sin_retraso >= 20:
        candidatos.append("siempre_a_tiempo")
    if sin_retraso >= 50:
        candidatos.append("reloj_suizo")

    # Rating
    if rating_avg >= 4.5 and rating_count >= 10:
        candidatos.append("bien_valorado")
    if rating_avg >= 4.8 and rating_count >= 30:
        candidatos.append("excelencia")
    if rating_avg >= 4.9 and rating_count >= 100:
        candidatos.append("diamante")

    # Volumen
    if completed >= 1:
        candidatos.append("despegue")
    if completed >= 10:
        candidatos.append("activo")
    if completed >= 50:
        candidatos.append("veterano")
    if completed >= 100:
        candidatos.append("centurion")
    if completed >= 500:
        candidatos.append("leyenda")

    # Compromiso
    if sin_cancelacion >= 20:
        candidatos.append("cero_cancelaciones")
    if sin_cancelacion >= 50:
        candidatos.append("confiable")

    # Especialización
    tipo_map = {
        "RESIDENCIAL": "residencial", "EVENTOS": "eventos",
        "COMERCIAL": "comercial", "ESCOLTA": "escolta", "CUSTODIA": "custodia",
    }
    for tipo_key, badge_id in tipo_map.items():
        if tipos.get(tipo_key, 0) >= 20:
            candidatos.append(badge_id)

    badges_nuevos_ids = [b for b in candidatos if b not in badges_actuales]
    ahora = datetime.now(timezone.utc).isoformat()
    badges_nuevos_detalle: list[dict] = []

    for badge_id in badges_nuevos_ids:
        info = BADGE_CATALOG[badge_id]
        badges_actuales.add(badge_id)

        if db is not None:
            db.table("agent_badges").insert({
                "id": str(uuid.uuid4()),
                "agent_id": agent_id,
                "badge": badge_id,
                "nombre": info["nombre"],
                "emoji": info["emoji"],
                "categoria": info["categoria"],
                "created_at": ahora,
            }).execute()

        badges_nuevos_detalle.append({
            "id": badge_id,
            "nombre": info["nombre"],
            "emoji": info["emoji"],
            "categoria": info["categoria"],
            "descripcion": info["descripcion"],
        })
        logger.info(f"🏅 [BADGE] {info['nombre']} {info['emoji']} otorgado a agente {agent_id}")

    nueva_comision = _calcular_comision(list(badges_actuales))

    if db is not None and badges_nuevos_ids:
        db.table("agent_profiles").update({"comision_pct": nueva_comision}).eq("id", agent_id).execute()

    return {
        "badges_nuevos": badges_nuevos_detalle,
        "nueva_comision": nueva_comision,
        "badges_totales": sorted(badges_actuales),
    }
