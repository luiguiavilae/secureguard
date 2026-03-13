# TODO: Tests para endpoints de servicios
# Casos: crear servicio, aceptar, iniciar, completar, cancelar con/sin penalización
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_create_service():
    # TODO: Implementar test
    pass


@pytest.mark.asyncio
async def test_cancel_service_with_penalty():
    # TODO: Implementar test
    pass
