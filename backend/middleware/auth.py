import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

_security = HTTPBearer()


class CurrentUser(BaseModel):
    user_id: str
    phone: str
    tipo: str  # "CLIENTE" | "AGENTE"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> CurrentUser:
    """
    Valida el JWT Bearer token y retorna los datos del usuario autenticado.
    Inyectable como dependencia: Depends(get_current_user)

    Lanza HTTP 401 si el token es inválido, expirado o con payload incompleto.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.backend_secret_key,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        logger.warning(f"Token JWT inválido: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("user_id", "")
    phone: str = payload.get("phone", "")
    tipo: str = payload.get("tipo", "")

    if not user_id or not phone or not tipo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token con payload incompleto",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(user_id=user_id, phone=phone, tipo=tipo)
