import logging
import random
import re
import string
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from jose import jwt
from pydantic import BaseModel, field_validator

from config import settings
from services.supabase import get_supabase
from services.twilio import send_sms

logger = logging.getLogger(__name__)
router = APIRouter()

_PHONE_RE = re.compile(r"^9\d{8}$")

# ── Rate limit para verify-otp (en memoria; suficiente para instancia única) ──
_verify_lock = threading.Lock()
_verify_store: dict[str, deque] = defaultdict(deque)
_MAX_VERIFY_ATTEMPTS = 10   # intentos por número por hora
_VERIFY_WINDOW = 3600       # 1 hora en segundos


def _mask_phone(phone: str) -> str:
    """Enmascara teléfono para logs: 912345678 → 9***678"""
    if len(phone) >= 4:
        return phone[:1] + "***" + phone[-3:]
    return "***"


def _check_verify_rate_limit(phone: str) -> None:
    now = time.time()
    window_start = now - _VERIFY_WINDOW
    with _verify_lock:
        ts = _verify_store[phone]
        while ts and ts[0] < window_start:
            ts.popleft()
        if len(ts) >= _MAX_VERIFY_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Demasiados intentos de verificación. "
                    "Solicita un código nuevo o espera una hora."
                ),
            )
        ts.append(now)


# ── Helpers de validación ────────────────────────────────────

def _normalize_phone(v: str) -> str:
    """Elimina espacios/guiones y el prefijo +51 / 51 si está presente."""
    v = re.sub(r"[\s\-]", "", v)
    if v.startswith("+51"):
        v = v[3:]
    elif v.startswith("51") and len(v) == 11:
        v = v[2:]
    return v


def _parse_ts(ts: str) -> datetime:
    """Parsea timestamp ISO de Supabase (maneja sufijo Z y +00:00)."""
    ts = ts.replace("Z", "+00:00")
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ── Modelos ──────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = _normalize_phone(v)
        if not _PHONE_RE.match(v):
            raise ValueError(
                "Número de teléfono inválido. "
                "Debe empezar con 9 y tener exactamente 9 dígitos (ej: 912345678)"
            )
        return v


class SendOTPResponse(BaseModel):
    message: str
    expires_in: int  # segundos


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    tipo: Literal["CLIENTE", "AGENTE"]

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = _normalize_phone(v)
        if not _PHONE_RE.match(v):
            raise ValueError("Número de teléfono inválido")
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise ValueError("El OTP debe ser de 6 dígitos numéricos")
        return v


class VerifyOTPResponse(BaseModel):
    access_token: str
    user_id: str
    tipo: str
    is_new_user: bool


# ── Helpers internos ─────────────────────────────────────────

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _create_jwt(user_id: str, phone: str, tipo: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {
        "user_id": user_id,
        "phone": phone,
        "tipo": tipo,
        "exp": expire,
    }
    return jwt.encode(payload, settings.backend_secret_key, algorithm="HS256")


# ── Endpoints ─────────────────────────────────────────────────

@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
    status_code=status.HTTP_200_OK,
)
async def send_otp(body: SendOTPRequest):
    """
    Genera y envía un OTP de 6 dígitos al número peruano indicado.
    Rate limit: máximo 3 solicitudes por número por hora.
    """
    phone = body.phone
    logger.info(f"Solicitud OTP para teléfono {_mask_phone(phone)}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # ── 1. Rate limit ──────────────────────────────────────
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    attempts_result = (
        db.table("otp_attempts")
        .select("*", count="exact")
        .eq("phone", phone)
        .gte("created_at", one_hour_ago)
        .execute()
    )
    if (attempts_result.count or 0) >= settings.effective_otp_rate_limit:
        logger.warning(f"Rate limit OTP alcanzado para {_mask_phone(phone)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Demasiados intentos. Has alcanzado el límite de "
                f"{settings.effective_otp_rate_limit} códigos por hora. "
                "Espera un momento antes de solicitar otro."
            ),
        )

    # ── 2. Generar y guardar OTP ───────────────────────────
    otp_code = _generate_otp()
    if settings.is_mock_supabase:
        logger.info(f"🔐 [MOCK] OTP para {_mask_phone(phone)}: {otp_code}")
    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)
    ).isoformat()

    db.table("otp_codes").insert(
        {
            "phone": phone,
            "code": otp_code,
            "expires_at": expires_at,
            "used": False,
        }
    ).execute()

    # ── 3. Registrar intento ───────────────────────────────
    db.table("otp_attempts").insert({"phone": phone}).execute()

    # ── 4. Enviar SMS ─────────────────────────────────────
    msg_text = (
        f"Salvus: tu código de acceso es {otp_code}. "
        f"Válido por {settings.otp_expire_minutes} minutos. "
        "No lo compartas con nadie."
    )
    sms_ok = send_sms(phone, msg_text)
    if not sms_ok:
        logger.error(f"Fallo al enviar SMS a {_mask_phone(phone)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo enviar el SMS. Intenta nuevamente en unos segundos.",
        )

    logger.info(f"OTP generado y enviado a {_mask_phone(phone)}")
    return SendOTPResponse(
        message="OTP enviado correctamente",
        expires_in=settings.otp_expire_minutes * 60,
    )


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_otp(body: VerifyOTPRequest):
    """
    Verifica el OTP. Si es válido, crea o recupera el usuario y emite un JWT de 30 días.
    """
    phone = body.phone
    _check_verify_rate_limit(phone)
    logger.info(f"Verificación OTP para {_mask_phone(phone)} | tipo: {body.tipo}")

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # ── 1. Buscar OTP (sin filtros de estado para dar mensajes claros) ──
    otp_result = (
        db.table("otp_codes")
        .select("*")
        .eq("phone", phone)
        .eq("code", body.otp)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not otp_result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP inválido. Verifica el código o solicita uno nuevo.",
        )

    record = otp_result.data[0]

    # ── 2. Validar estado del OTP ──────────────────────────
    if record["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este OTP ya fue utilizado. Solicita un código nuevo.",
        )

    if datetime.now(timezone.utc) > _parse_ts(record["expires_at"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expirado. Solicita un código nuevo.",
        )

    # ── 3. Marcar OTP como usado ───────────────────────────
    db.table("otp_codes").update({"used": True}).eq("id", record["id"]).execute()

    # ── 4. Buscar o crear usuario ──────────────────────────
    user_result = (
        db.table("users").select("*").eq("phone", phone).limit(1).execute()
    )
    is_new_user = not bool(user_result.data)

    if is_new_user:
        created = db.table("users").insert({"phone": phone, "tipo": body.tipo}).execute()
        user = created.data[0]
        logger.info(f"Usuario nuevo creado: {user['id']} | tipo: {body.tipo} | tel: {_mask_phone(phone)}")
    else:
        user = user_result.data[0]
        logger.info(f"Usuario existente recuperado: {user['id']} | tel: {_mask_phone(phone)}")

    # ── 5. Emitir JWT ──────────────────────────────────────
    token = _create_jwt(
        user_id=user["id"],
        phone=phone,
        tipo=user["tipo"],
    )

    return VerifyOTPResponse(
        access_token=token,
        user_id=user["id"],
        tipo=user["tipo"],
        is_new_user=is_new_user,
    )
