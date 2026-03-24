from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from middleware.auth import CurrentUser, get_current_user
from services.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM_CONFIG = {
    "precio_hora_cliente": 50,
    "minimo_horas": 3,
    "precio_hora_agente": 30,
    "comision_plataforma": 0.20,
    "penalizacion_cancelacion": 15,
    "cuorum_timeout_horas": 4,
}


def _log_event(
    db,
    service_id: str,
    tipo: str,
    actor_id: str,
    datos: Optional[dict] = None,
) -> None:
    try:
        db.table("service_events").insert(
            {
                "service_id": service_id,
                "tipo": tipo,
                "actor_id": actor_id,
                "datos": datos or {},
            }
        ).execute()
    except Exception as exc:
        logger.warning(f"_log_event falló (no crítico): {exc}")


def _designate_leader(db, service_id: str, agente_ids: list[str]) -> str:
    """Designate leader among accepted agents. Returns leader agente_id."""
    if not agente_ids:
        return ""
    if len(agente_ids) == 1:
        db.table("service_agents").update({"es_lider": True}).eq(
            "service_id", service_id
        ).eq("agente_id", agente_ids[0]).execute()
        return agente_ids[0]

    profiles_result = (
        db.table("agent_profiles")
        .select("user_id,score,servicios_completados,rating_avg,penalizaciones_activas")
        .in_("user_id", agente_ids)
        .execute()
    )
    profiles = {p["user_id"]: p for p in (profiles_result.data or [])}

    def meets_criteria(aid: str) -> bool:
        p = profiles.get(aid, {})
        return (
            p.get("score", 0) >= 70
            and p.get("servicios_completados", 0) >= 20
            and p.get("rating_avg", 0.0) >= 4.5
            and p.get("penalizaciones_activas", 1) == 0
        )

    qualified = [aid for aid in agente_ids if meets_criteria(aid)]
    candidates = qualified if qualified else agente_ids
    leader_id = max(candidates, key=lambda aid: profiles.get(aid, {}).get("score", 0))

    db.table("service_agents").update({"es_lider": True}).eq(
        "service_id", service_id
    ).eq("agente_id", leader_id).execute()

    logger.info(f"Líder designado: {leader_id} para servicio {service_id}")
    return leader_id


def _check_and_reset_cuorum_timeout(db, service: dict) -> dict:
    """If PARCIAL service exceeded 4h timeout, reset it. Returns updated service dict."""
    if service.get("estado") != "PARCIAL":
        return service

    updated_at_str = service.get("updated_at", "")
    try:
        updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return service

    timeout_hours = SYSTEM_CONFIG["cuorum_timeout_horas"]
    if datetime.now(timezone.utc) - updated_at <= timedelta(hours=timeout_hours):
        return service

    # Timeout expired — reset service
    service_id = service["id"]
    db.table("service_requests").update(
        {"estado": "ABIERTA", "cupos_cubiertos": 0}
    ).eq("id", service_id).execute()

    db.table("service_agents").update({"estado": "TIMEOUT"}).eq(
        "service_id", service_id
    ).eq("estado", "ACEPTADO").execute()

    _log_event(db, service_id, "CUORUM_TIMEOUT", "SISTEMA")
    logger.warning(
        f"[CUORUM_TIMEOUT] Servicio {service_id}: cuórum no completado en {timeout_hours}h. Resetando a ABIERTA."
    )

    return {**service, "estado": "ABIERTA", "cupos_cubiertos": 0}


# ── Modelos ──────────────────────────────────────────────────

class CreateServiceRequest(BaseModel):
    descripcion: str
    distrito: str
    tipo_servicio: str
    agentes_requeridos: int = 1
    duracion_horas: int
    fecha_inicio_solicitada: str  # ISO datetime string

    @field_validator("duracion_horas")
    @classmethod
    def validate_duracion(cls, v: int) -> int:
        minimo = SYSTEM_CONFIG["minimo_horas"]
        if v < minimo:
            raise ValueError(f"La duración mínima es de {minimo} horas")
        return v

    @field_validator("agentes_requeridos")
    @classmethod
    def validate_agentes(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Se requiere al menos 1 agente")
        return v


class SelectAgentRequest(BaseModel):
    agente_id: str


class AgentRespondRequest(BaseModel):
    decision: str  # "ACEPTAR" | "RECHAZAR"

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        v = v.upper()
        if v not in ("ACEPTAR", "RECHAZAR"):
            raise ValueError("La decisión debe ser ACEPTAR o RECHAZAR")
        return v


class SOSRequest(BaseModel):
    tipo: str  # "CLIENTE" | "AGENTE"
    descripcion: str

    @field_validator("tipo")
    @classmethod
    def validate_tipo(cls, v: str) -> str:
        v = v.upper()
        if v not in ("CLIENTE", "AGENTE"):
            raise ValueError("El tipo debe ser CLIENTE o AGENTE")
        return v


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_service(
    body: CreateServiceRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Crea una nueva solicitud de servicio. Solo clientes."""
    if user.tipo != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes pueden crear servicios",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    precio_total = (
        body.agentes_requeridos
        * body.duracion_horas
        * SYSTEM_CONFIG["precio_hora_cliente"]
    )

    try:
        result = db.table("service_requests").insert(
            {
                "cliente_id": user.user_id,
                "descripcion": body.descripcion,
                "distrito": body.distrito,
                "tipo_servicio": body.tipo_servicio,
                "agentes_requeridos": body.agentes_requeridos,
                "duracion_horas": body.duracion_horas,
                "fecha_inicio_solicitada": body.fecha_inicio_solicitada,
                "precio_total": precio_total,
                "estado": "ABIERTA",
                "cupos_cubiertos": 0,
            }
        ).execute()
    except Exception as exc:
        logger.error(f"Error Supabase al insertar servicio: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el servicio: {exc}",
        )

    if not result.data:
        logger.error(
            f"Supabase insert retornó data vacía — posible RLS, constraint o tabla inexistente. "
            f"cliente: {user.user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el servicio. Verifica la configuración de la base de datos.",
        )

    service = result.data[0]
    _log_event(db, service["id"], "SERVICIO_CREADO", user.user_id)
    logger.info(f"Servicio creado: {service['id']} | cliente: {user.user_id} | agentes: {body.agentes_requeridos} | total: S/.{precio_total}")
    return service


@router.get("/my-active")
async def get_my_active_services(user: CurrentUser = Depends(get_current_user)):
    """Retorna servicios activos del usuario autenticado."""
    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    if user.tipo == "CLIENTE":
        result = db.table("service_requests").select("*").eq("cliente_id", user.user_id).execute()
    else:
        result = db.table("service_requests").select("*").eq("agente_asignado_id", user.user_id).execute()

    active_states = {"ABIERTA", "PARCIAL", "EN_REVISION", "CONFIRMADO", "CONFIRMADO_PAGADO", "EN_CURSO"}
    return [s for s in (result.data or []) if s.get("estado") in active_states]


@router.get("/open")
async def get_open_services(user: CurrentUser = Depends(get_current_user)):
    """Lista servicios ABIERTA/PARCIAL disponibles para agentes (Flujo B).
    Incluye info de cupos: cupos_total, cupos_cubiertos, cupos_disponibles.
    """
    if user.tipo != "AGENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo agentes pueden ver servicios abiertos",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    result = (
        db.table("service_requests")
        .select("*")
        .in_("estado", ["ABIERTA", "PARCIAL"])
        .execute()
    )

    services = []
    for s in (result.data or []):
        # Skip Flujo A services assigned to another agent
        agente_sel = s.get("agente_seleccionado_id")
        if agente_sel and agente_sel != user.user_id:
            continue

        cupos_total = s.get("agentes_requeridos", 1)
        cupos_cubiertos = s.get("cupos_cubiertos", 0)
        services.append({
            **s,
            "cupos_total": cupos_total,
            "cupos_cubiertos": cupos_cubiertos,
            "cupos_disponibles": cupos_total - cupos_cubiertos,
        })

    return services


@router.get("/{service_id}")
async def get_service(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Retorna el detalle de una solicitud de servicio."""
    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    return result.data[0]


@router.post("/{service_id}/select-agent")
async def select_agent(
    service_id: str,
    body: SelectAgentRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Flujo A: el cliente selecciona un agente específico."""
    if user.tipo != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes pueden seleccionar agentes",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    if service["cliente_id"] != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if service["estado"] != "ABIERTA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El servicio no está disponible para asignación",
        )

    agente_result = (
        db.table("agent_profiles")
        .select("*")
        .eq("user_id", body.agente_id)
        .limit(1)
        .execute()
    )
    if not agente_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agente no encontrado")
    if agente_result.data[0].get("status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El agente no está verificado",
        )

    db.table("service_requests").update(
        {"agente_seleccionado_id": body.agente_id}
    ).eq("id", service_id).execute()

    db.table("service_agents").insert(
        {"service_id": service_id, "agente_id": body.agente_id, "estado": "PENDIENTE"}
    ).execute()

    _log_event(db, service_id, "AGENTE_SELECCIONADO", user.user_id, {"agente_id": body.agente_id})
    logger.info(f"Agente {body.agente_id} seleccionado para servicio {service_id} (Flujo A)")
    return {"message": "Agente seleccionado. Esperando respuesta del agente."}


@router.post("/{service_id}/agent-respond")
async def agent_respond(
    service_id: str,
    body: AgentRespondRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Agente responde ACEPTAR o RECHAZAR a una solicitud.

    Flujo A: solo el agente pre-seleccionado puede responder.
    Flujo B: cualquier agente puede aplicar; soporta N agentes (multi-agente).
    """
    if user.tipo != "AGENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo agentes pueden responder a solicitudes",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    agente_seleccionado = service.get("agente_seleccionado_id")
    es_flujo_a = bool(agente_seleccionado)

    if es_flujo_a:
        # ── Flujo A: solo el agente pre-seleccionado puede responder ──
        if service["estado"] != "ABIERTA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado de servicio inválido para respuesta",
            )
        if agente_seleccionado != user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este servicio fue asignado a otro agente",
            )

        if body.decision == "ACEPTAR":
            db.table("service_requests").update(
                {"estado": "CONFIRMADO", "agente_asignado_id": user.user_id}
            ).eq("id", service_id).execute()
            db.table("service_agents").update({"estado": "ACEPTADO"}).eq(
                "service_id", service_id
            ).eq("agente_id", user.user_id).execute()
            _log_event(db, service_id, "AGENTE_ACEPTO", user.user_id)
            logger.info(f"Agente {user.user_id} aceptó servicio {service_id} (Flujo A) → CONFIRMADO")
            return {"message": "Servicio confirmado. Procede con el pago.", "estado": "CONFIRMADO"}
        else:
            db.table("service_requests").update(
                {"estado": "ABIERTA", "agente_seleccionado_id": None}
            ).eq("id", service_id).execute()
            db.table("service_agents").update({"estado": "RECHAZADO"}).eq(
                "service_id", service_id
            ).eq("agente_id", user.user_id).execute()
            _log_event(db, service_id, "AGENTE_RECHAZO", user.user_id)
            return {"message": "Servicio rechazado. El cliente puede seleccionar otro agente.", "estado": "ABIERTA"}

    else:
        # ── Flujo B: cualquier agente puede aplicar (multi-agente) ──

        # Check and handle cuórum timeout for PARCIAL services
        service = _check_and_reset_cuorum_timeout(db, service)

        if service["estado"] not in ("ABIERTA", "PARCIAL"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El servicio ya no está disponible",
            )

        if body.decision == "RECHAZAR":
            return {"message": "Servicio no aceptado.", "estado": service["estado"]}

        # Check if this agent already applied
        existing_result = (
            db.table("service_agents")
            .select("id")
            .eq("service_id", service_id)
            .eq("agente_id", user.user_id)
            .execute()
        )
        if existing_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya aplicaste a este servicio",
            )

        agentes_requeridos = service.get("agentes_requeridos", 1)
        cupos_cubiertos = service.get("cupos_cubiertos", 0)
        new_cupos = cupos_cubiertos + 1

        # Insert agent into service_agents
        db.table("service_agents").insert(
            {"service_id": service_id, "agente_id": user.user_id, "estado": "ACEPTADO"}
        ).execute()

        if new_cupos >= agentes_requeridos:
            # Cuórum complete → EN_REVISION
            update_payload: dict = {
                "estado": "EN_REVISION",
                "cupos_cubiertos": new_cupos,
            }
            if agentes_requeridos == 1:
                # Single-agent: maintain backward compat
                update_payload["agente_seleccionado_id"] = user.user_id

            db.table("service_requests").update(update_payload).eq("id", service_id).execute()

            # Fetch all accepted agents and designate leader
            accepted_result = (
                db.table("service_agents")
                .select("agente_id")
                .eq("service_id", service_id)
                .eq("estado", "ACEPTADO")
                .execute()
            )
            accepted_ids = [r["agente_id"] for r in (accepted_result.data or [])]
            leader_id = _designate_leader(db, service_id, accepted_ids)

            _log_event(db, service_id, "CUORUM_COMPLETO", user.user_id, {
                "agentes": accepted_ids,
                "lider": leader_id,
            })
            logger.info(
                f"Cuórum completo para servicio {service_id}: {new_cupos}/{agentes_requeridos} agentes | líder: {leader_id}"
            )

            if agentes_requeridos == 1:
                return {
                    "message": "Solicitud enviada. Esperando confirmación del cliente.",
                    "estado": "EN_REVISION",
                }
            return {
                "message": f"Cuórum completado ({agentes_requeridos} agentes). Esperando confirmación del cliente.",
                "estado": "EN_REVISION",
                "cupos_cubiertos": new_cupos,
                "cupos_total": agentes_requeridos,
                "lider_id": leader_id,
            }

        else:
            # Partial — more agents needed
            db.table("service_requests").update(
                {"estado": "PARCIAL", "cupos_cubiertos": new_cupos}
            ).eq("id", service_id).execute()

            _log_event(db, service_id, "AGENTE_APLICO", user.user_id, {
                "cupos_cubiertos": new_cupos,
                "cupos_total": agentes_requeridos,
            })
            logger.info(
                f"Agente {user.user_id} aplicó a servicio {service_id} — {new_cupos}/{agentes_requeridos} (Flujo B PARCIAL)"
            )
            return {
                "message": f"Solicitud registrada ({new_cupos}/{agentes_requeridos} agentes). Esperando más agentes.",
                "estado": "PARCIAL",
                "cupos_cubiertos": new_cupos,
                "cupos_total": agentes_requeridos,
            }


@router.post("/{service_id}/client-confirm")
async def client_confirm(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Flujo B: el cliente confirma al agente/equipo que aplicó."""
    if user.tipo != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes pueden confirmar agentes",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    if service["cliente_id"] != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if service["estado"] != "EN_REVISION":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El servicio no está en revisión",
        )

    agentes_requeridos = service.get("agentes_requeridos", 1)

    if agentes_requeridos == 1:
        # Single-agent: use agente_seleccionado_id as before
        agente_id = service.get("agente_seleccionado_id")
        if not agente_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay agente pendiente de confirmación",
            )
        db.table("service_requests").update(
            {"estado": "CONFIRMADO", "agente_asignado_id": agente_id}
        ).eq("id", service_id).execute()
        db.table("service_agents").update({"estado": "ACEPTADO"}).eq(
            "service_id", service_id
        ).eq("agente_id", agente_id).execute()
        _log_event(db, service_id, "CLIENTE_CONFIRMO", user.user_id, {"agente_id": agente_id})
        logger.info(f"Cliente confirmó agente {agente_id} para servicio {service_id} → CONFIRMADO")
        return {"message": "Agente confirmado. Procede con el pago.", "agente_id": agente_id, "estado": "CONFIRMADO"}

    else:
        # Multi-agent: find leader as agente_asignado_id
        leader_result = (
            db.table("service_agents")
            .select("agente_id")
            .eq("service_id", service_id)
            .eq("es_lider", True)
            .limit(1)
            .execute()
        )
        if not leader_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró líder del equipo",
            )
        leader_id = leader_result.data[0]["agente_id"]

        db.table("service_requests").update(
            {"estado": "CONFIRMADO", "agente_asignado_id": leader_id}
        ).eq("id", service_id).execute()

        _log_event(db, service_id, "CLIENTE_CONFIRMO_EQUIPO", user.user_id, {"lider_id": leader_id})
        logger.info(
            f"Cliente confirmó equipo de {agentes_requeridos} agentes para servicio {service_id} | líder: {leader_id}"
        )
        return {
            "message": f"Equipo de {agentes_requeridos} agentes confirmado. Procede con el pago.",
            "lider_id": leader_id,
            "agentes_requeridos": agentes_requeridos,
            "estado": "CONFIRMADO",
        }


@router.post("/{service_id}/start")
async def start_service(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """El agente asignado marca el servicio como iniciado."""
    if user.tipo != "AGENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo agentes pueden iniciar servicios",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    if service.get("agente_asignado_id") != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres el agente asignado a este servicio",
        )
    if service["estado"] != "CONFIRMADO_PAGADO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El servicio debe estar pagado antes de iniciar",
        )

    db.table("service_requests").update(
        {
            "estado": "EN_CURSO",
            "fecha_inicio_real": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", service_id).execute()
    _log_event(db, service_id, "SERVICIO_INICIADO", user.user_id)
    logger.info(f"Servicio {service_id} iniciado por agente {user.user_id}")
    return {"message": "Servicio iniciado.", "estado": "EN_CURSO"}


@router.post("/{service_id}/complete")
async def complete_service(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """El agente asignado marca el servicio como completado."""
    if user.tipo != "AGENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo agentes pueden completar servicios",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    if service.get("agente_asignado_id") != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres el agente asignado a este servicio",
        )
    if service["estado"] != "EN_CURSO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El servicio debe estar en curso para completar",
        )

    db.table("service_requests").update(
        {
            "estado": "COMPLETADO",
            "fecha_fin_real": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", service_id).execute()
    _log_event(db, service_id, "SERVICIO_COMPLETADO", user.user_id)
    logger.info(f"Servicio {service_id} completado por agente {user.user_id}")
    return {"message": "Servicio completado. ¡Gracias!", "estado": "COMPLETADO"}


@router.post("/{service_id}/force-confirm")
async def force_confirm(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Solo disponible en BACKEND_ENV=development. Fuerza estado CONFIRMADO para pruebas."""
    from config import settings
    if settings.backend_env.lower() not in ("development", "test"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    result = db.table("service_requests").select("id,cliente_id").eq("id", service_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    if result.data[0]["cliente_id"] != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    db.table("service_requests").update({"estado": "CONFIRMADO"}).eq("id", service_id).execute()
    _log_event(db, service_id, "FORCE_CONFIRM_DEV", user.user_id)
    logger.warning(f"[DEV] force-confirm aplicado al servicio {service_id} por {user.user_id}")
    return {"estado": "CONFIRMADO", "message": "Estado forzado a CONFIRMADO (solo desarrollo)"}


@router.post("/{service_id}/sos")
async def sos(
    service_id: str,
    body: SOSRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Activa una alerta SOS desde un servicio activo.

    Registra incidente crítico y en producción notificaría a PNP/Serenazgo.
    """
    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]

    # Verify caller is related to the service
    is_cliente = service.get("cliente_id") == user.user_id
    is_agente = service.get("agente_asignado_id") == user.user_id

    if not (is_cliente or is_agente):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás asociado a este servicio",
        )

    # Register SOS incident
    incidente_result = db.table("service_incidents").insert(
        {
            "service_id": service_id,
            "tipo": "SOS",
            "subtipo": body.tipo,
            "descripcion": body.descripcion,
            "reportado_por": user.user_id,
        }
    ).execute()

    incidente_id = None
    if incidente_result.data:
        incidente_id = incidente_result.data[0].get("id")

    _log_event(db, service_id, "SOS_ACTIVADO", user.user_id, {
        "tipo": body.tipo,
        "descripcion": body.descripcion,
    })

    logger.warning(f"🚨 [SOS] Activado en servicio {service_id} por {body.tipo} (usuario: {user.user_id})")

    # TODO (producción): notificar a PNP/Serenazgo vía API de emergencias

    return {
        "incidente_id": incidente_id,
        "mensaje": "SOS registrado. Ayuda en camino.",
    }
