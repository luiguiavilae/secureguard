from __future__ import annotations

import logging
from datetime import datetime, timezone
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
}


def _log_event(
    db,
    service_id: str,
    tipo: str,
    actor_id: str,
    datos: Optional[dict] = None,
) -> None:
    db.table("service_events").insert(
        {
            "service_id": service_id,
            "tipo": tipo,
            "actor_id": actor_id,
            "datos": datos or {},
        }
    ).execute()


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
        }
    ).execute()

    service = result.data[0]
    _log_event(db, service["id"], "SERVICIO_CREADO", user.user_id)
    logger.info(f"Servicio creado: {service['id']} | cliente: {user.user_id} | total: S/.{precio_total}")
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

    active_states = {"ABIERTA", "EN_REVISION", "CONFIRMADO", "CONFIRMADO_PAGADO", "EN_CURSO"}
    return [s for s in (result.data or []) if s.get("estado") in active_states]


@router.get("/open")
async def get_open_services(user: CurrentUser = Depends(get_current_user)):
    """Lista servicios ABIERTA disponibles para que agentes apliquen (Flujo B)."""
    if user.tipo != "AGENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo agentes pueden ver servicios abiertos",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    result = db.table("service_requests").select("*").eq("estado", "ABIERTA").execute()

    # Excluir servicios de Flujo A ya asignados a otro agente
    return [
        s for s in (result.data or [])
        if not s.get("agente_seleccionado_id")
        or s.get("agente_seleccionado_id") == user.user_id
    ]


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

    # Verificar que el agente exista y esté verificado
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
    """Agente responde ACEPTAR o RECHAZAR a una solicitud."""
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
        # ── Flujo B: cualquier agente puede aplicar a servicio abierto ──
        if service["estado"] != "ABIERTA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El servicio ya no está disponible",
            )

        if body.decision == "ACEPTAR":
            db.table("service_requests").update(
                {"estado": "EN_REVISION", "agente_seleccionado_id": user.user_id}
            ).eq("id", service_id).execute()
            db.table("service_agents").insert(
                {"service_id": service_id, "agente_id": user.user_id, "estado": "PENDIENTE"}
            ).execute()
            _log_event(db, service_id, "AGENTE_APLICO", user.user_id)
            logger.info(f"Agente {user.user_id} aplicó a servicio {service_id} (Flujo B) → EN_REVISION")
            return {"message": "Solicitud enviada. Esperando confirmación del cliente.", "estado": "EN_REVISION"}
        else:
            return {"message": "Servicio no aceptado.", "estado": "ABIERTA"}


@router.post("/{service_id}/client-confirm")
async def client_confirm(
    service_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Flujo B: el cliente confirma al agente que aplicó."""
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
    logger.info(f"Cliente confirmó agente {agente_id} para servicio {service_id} (Flujo B) → CONFIRMADO")
    return {"message": "Agente confirmado. Procede con el pago.", "agente_id": agente_id, "estado": "CONFIRMADO"}


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
