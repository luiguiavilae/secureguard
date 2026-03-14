from __future__ import annotations

import logging
import re
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, field_validator

from config import settings
from middleware.auth import CurrentUser, get_current_user
from services.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

_REQUIRED_DOC_TIPOS = {"DNI_FRENTE", "DNI_REVERSO", "SUCAMEC", "SELFIE"}
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


# ── Modelos ──────────────────────────────────────────────────

class AgentRegisterRequest(BaseModel):
    distritos: list[str]
    tipos_servicio: list[str]
    horario_inicio: str   # HH:MM
    horario_fin: str      # HH:MM
    presentaciones: list[str]
    genero: str           # "M" | "F"

    @field_validator("genero")
    @classmethod
    def validate_genero(cls, v: str) -> str:
        if v not in ("M", "F"):
            raise ValueError("El campo genero debe ser 'M' o 'F'")
        return v

    @field_validator("horario_inicio", "horario_fin")
    @classmethod
    def validate_time(cls, v: str) -> str:
        if not _TIME_RE.match(v):
            raise ValueError("El horario debe tener formato HH:MM (ej: 08:00)")
        return v

    @field_validator("distritos", "tipos_servicio")
    @classmethod
    def validate_non_empty_list(cls, v: list) -> list:
        if not v:
            raise ValueError("La lista no puede estar vacía")
        return v


class AgentRegisterResponse(BaseModel):
    agent_id: str
    estado: str


class DocumentUploadResponse(BaseModel):
    document_id: str
    url: str
    tipo: str
    estado: str


class AgentProfileResponse(BaseModel):
    agent_id: str
    user_id: str
    estado_verificacion: str
    distritos: list[str]
    tipos_servicio: list[str]
    horario_inicio: Optional[str]
    horario_fin: Optional[str]
    presentaciones: list[str]
    genero: Optional[str]
    en_servicio: bool
    score: float
    nivel: int
    rating_avg: float
    rating_count: int
    completed_services: int
    documentos: list[dict]
    badges: list[str]


class AvailabilityUpdate(BaseModel):
    en_servicio: bool


# ── Endpoints ─────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AgentRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_agent(
    body: AgentRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Registra el perfil de un agente. Lo pone en cola de verificación manual (EN_REVISION).
    El operador admin revisará los documentos antes de activar el agente.
    """
    logger.info(f"Registro de agente para user_id={current_user.user_id}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # Verificar que no exista un perfil previo para este usuario
    existing = (
        db.table("agent_profiles")
        .select("id")
        .eq("user_id", current_user.user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este usuario ya tiene un perfil de agente registrado.",
        )

    # Crear agent_profile
    profile_result = (
        db.table("agent_profiles")
        .insert(
            {
                "user_id": current_user.user_id,
                "status": "pending",
                # columna original del schema 001
                "districts": body.distritos,
                # columnas nuevas del schema 002
                "tipos_servicio": body.tipos_servicio,
                "horario_inicio": body.horario_inicio,
                "horario_fin": body.horario_fin,
                "presentaciones": body.presentaciones,
                "genero": body.genero,
                "en_servicio": False,
            }
        )
        .execute()
    )
    if not profile_result.data:
        logger.error("Supabase no retornó datos al crear agent_profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el perfil del agente. Intenta nuevamente.",
        )

    agent_id: str = profile_result.data[0]["id"]

    # Crear entrada en cola de verificación
    db.table("agent_verification_queue").insert(
        {"agent_id": agent_id, "estado": "EN_REVISION"}
    ).execute()

    logger.info(f"Agente {agent_id} registrado → estado EN_REVISION")
    return AgentRegisterResponse(agent_id=agent_id, estado="EN_REVISION")


@router.post(
    "/{agent_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    agent_id: str,
    tipo: Annotated[str, Form(description="DNI_FRENTE | DNI_REVERSO | SUCAMEC | SELFIE")],
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Sube un documento del agente a Supabase Storage.
    Si el agente ya tiene los 4 documentos, notifica al admin (log por ahora).
    """
    tipo = tipo.upper().strip()
    if tipo not in _REQUIRED_DOC_TIPOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"tipo debe ser uno de: {', '.join(sorted(_REQUIRED_DOC_TIPOS))}",
        )

    logger.info(f"Upload documento {tipo} para agente {agent_id}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # Verificar que el agente existe y pertenece al usuario actual
    profile_result = (
        db.table("agent_profiles")
        .select("id, user_id")
        .eq("id", agent_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agente no encontrado")

    if profile_result.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir documentos de este agente",
        )

    # Leer archivo
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío",
        )

    # Construir ruta en Storage: {agent_id}/{TIPO}.{ext}
    original_name = file.filename or "archivo"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "jpg"
    storage_path = f"{agent_id}/{tipo}.{ext}"
    content_type = file.content_type or "application/octet-stream"

    # Subir a Supabase Storage (upsert=true para reemplazar si ya existe)
    try:
        db.storage.from_(settings.storage_bucket_agent_docs).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        public_url: str = db.storage.from_(
            settings.storage_bucket_agent_docs
        ).get_public_url(storage_path)
    except Exception as exc:
        logger.error(f"Error subiendo a Storage: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al subir el archivo. Intenta nuevamente.",
        )

    # Upsert en agent_documents (único por agent_id + tipo)
    existing_doc = (
        db.table("agent_documents")
        .select("id")
        .eq("agent_id", agent_id)
        .eq("tipo", tipo)
        .limit(1)
        .execute()
    )
    if existing_doc.data:
        doc_result = (
            db.table("agent_documents")
            .update({"url": public_url, "estado": "PENDIENTE"})
            .eq("id", existing_doc.data[0]["id"])
            .execute()
        )
    else:
        doc_result = (
            db.table("agent_documents")
            .insert(
                {
                    "agent_id": agent_id,
                    "tipo": tipo,
                    "url": public_url,
                    "estado": "PENDIENTE",
                }
            )
            .execute()
        )

    doc = doc_result.data[0]

    # Verificar si el agente completó los 4 documentos
    all_docs = (
        db.table("agent_documents")
        .select("tipo")
        .eq("agent_id", agent_id)
        .execute()
    )
    uploaded = {d["tipo"] for d in (all_docs.data or [])}
    if _REQUIRED_DOC_TIPOS.issubset(uploaded):
        logger.info(
            f"Agente {agent_id} completó los 4 documentos requeridos. "
            "Pendiente: implementar notificación push/email al admin (Fase 2)."
        )

    logger.info(f"Documento {tipo} subido para agente {agent_id} → {public_url}")
    return DocumentUploadResponse(
        document_id=doc["id"],
        url=public_url,
        tipo=tipo,
        estado=doc["estado"],
    )


@router.get("/available", response_model=list[dict])
async def get_available_agents(
    distrito: str = Query(..., description="Distrito donde se requiere el servicio"),
    tipo_servicio: str = Query(..., description="Tipo de servicio requerido"),
    fecha: str = Query(..., description="Fecha del servicio (YYYY-MM-DD)"),
    hora: str = Query(..., description="Hora de inicio del servicio (HH:MM)"),
    genero_beneficiario: Optional[str] = Query(
        None,
        description="Filtro de género del agente: 'M' = solo masculinos, 'F' = todos",
    ),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Lista agentes verificados y disponibles según los criterios del servicio.
    Solo accesible para CLIENTES. Ordenados por score DESC.
    """
    if current_user.tipo != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los clientes pueden buscar agentes disponibles",
        )

    logger.info(
        f"Búsqueda de agentes: distrito={distrito}, tipo={tipo_servicio}, "
        f"hora={hora}, genero_beneficiario={genero_beneficiario}"
    )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # Normalizar hora a HH:MM:SS para comparación con columna TIME en Postgres
    hora_norm = hora if len(hora) == 8 else f"{hora}:00"

    query = (
        db.table("agent_profiles")
        .select(
            "id, user_id, districts, tipos_servicio, horario_inicio, horario_fin, "
            "genero, en_servicio, score, nivel, rating_avg, rating_count, "
            "completed_services, hourly_rate"
        )
        .eq("status", "verified")   # agente verificado por admin
        .eq("en_servicio", False)   # no está actualmente en un servicio
        .contains("districts", [distrito])
        .contains("tipos_servicio", [tipo_servicio])
        .lte("horario_inicio", hora_norm)   # agent empieza antes o a la hora solicitada
        .gte("horario_fin", hora_norm)      # agent termina después o a la hora solicitada
        .order("score", desc=True)
    )

    # Filtro de género: "M" solo masculinos; "F" (o sin filtro) acepta todos
    if genero_beneficiario == "M":
        query = query.eq("genero", "M")

    result = query.execute()
    return result.data or []


@router.get("/{agent_id}/profile", response_model=AgentProfileResponse)
async def get_agent_profile(
    agent_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retorna el perfil completo de un agente incluyendo documentos, estado y badges."""
    logger.info(f"Solicitud perfil agente {agent_id} por user {current_user.user_id}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    profile_result = (
        db.table("agent_profiles")
        .select("*")
        .eq("id", agent_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agente no encontrado")

    profile = profile_result.data[0]

    # Estado de verificación desde la cola
    queue_result = (
        db.table("agent_verification_queue")
        .select("estado")
        .eq("agent_id", agent_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    estado_verificacion = (
        queue_result.data[0]["estado"] if queue_result.data else "SIN_REGISTRO"
    )

    # Documentos subidos
    docs_result = (
        db.table("agent_documents")
        .select("tipo, url, estado, created_at")
        .eq("agent_id", agent_id)
        .execute()
    )

    # Badges
    badges_result = (
        db.table("agent_badges")
        .select("badge")
        .eq("agent_id", agent_id)
        .execute()
    )
    badges = [b["badge"] for b in (badges_result.data or [])]

    return AgentProfileResponse(
        agent_id=profile["id"],
        user_id=profile["user_id"],
        estado_verificacion=estado_verificacion,
        distritos=profile.get("districts") or [],
        tipos_servicio=profile.get("tipos_servicio") or [],
        horario_inicio=profile.get("horario_inicio"),
        horario_fin=profile.get("horario_fin"),
        presentaciones=profile.get("presentaciones") or [],
        genero=profile.get("genero"),
        en_servicio=profile.get("en_servicio", False),
        score=float(profile.get("score") or 0.0),
        nivel=int(profile.get("nivel") or 1),
        rating_avg=float(profile.get("rating_avg") or 0.0),
        rating_count=int(profile.get("rating_count") or 0),
        completed_services=int(profile.get("completed_services") or 0),
        documentos=docs_result.data or [],
        badges=badges,
    )


@router.post("/{agent_id}/evaluate-badges", status_code=status.HTTP_200_OK)
async def evaluate_agent_badges(
    agent_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Evalúa y otorga badges al agente según sus estadísticas actuales.
    Recalcula la comisión. Retorna badges nuevos obtenidos y comisión vigente.
    """
    logger.info(f"Evaluate badges para agente {agent_id} por user {current_user.user_id}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    from services.badges import evaluate_badges

    try:
        result = evaluate_badges(agent_id=agent_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return {
        "agent_id": agent_id,
        "badges_nuevos": result["badges_nuevos"],
        "nueva_comision": result["nueva_comision"],
        "badges_totales": result["badges_totales"],
    }


@router.patch("/{agent_id}/availability", status_code=status.HTTP_200_OK)
async def update_availability(
    agent_id: str,
    body: AvailabilityUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Actualiza el campo en_servicio del agente. Solo el propio agente puede hacerlo."""
    logger.info(
        f"Update disponibilidad agente {agent_id}: en_servicio={body.en_servicio} "
        f"por user {current_user.user_id}"
    )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    profile_result = (
        db.table("agent_profiles")
        .select("id, user_id")
        .eq("id", agent_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agente no encontrado")

    if profile_result.data[0]["user_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el propio agente puede actualizar su disponibilidad",
        )

    db.table("agent_profiles").update(
        {"en_servicio": body.en_servicio}
    ).eq("id", agent_id).execute()

    logger.info(f"Agente {agent_id} → en_servicio={body.en_servicio}")
    return {"agent_id": agent_id, "en_servicio": body.en_servicio}
