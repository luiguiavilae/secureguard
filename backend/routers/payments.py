# TODO: Implementar endpoints de pagos con Stripe
# Endpoints: POST /intent (crear PaymentIntent), POST /webhook (Stripe webhook),
#            GET /history, POST /payout (liberar pago al agente)
from fastapi import APIRouter

router = APIRouter()
