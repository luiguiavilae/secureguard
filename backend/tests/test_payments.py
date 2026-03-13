# TODO: Tests para endpoints de pagos
# Casos: crear PaymentIntent, webhook Stripe, liberar pago al agente
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_create_payment_intent():
    # TODO: Implementar test
    pass


@pytest.mark.asyncio
async def test_stripe_webhook_payment_success():
    # TODO: Implementar test
    pass
