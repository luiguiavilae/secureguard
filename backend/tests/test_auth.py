# TODO: Tests para endpoints de autenticación
# Casos: envío OTP válido, OTP inválido, token expirado, refresh token
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_send_otp():
    # TODO: Implementar test
    pass


@pytest.mark.asyncio
async def test_verify_otp_invalid():
    # TODO: Implementar test
    pass
