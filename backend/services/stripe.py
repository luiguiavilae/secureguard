# TODO: Implementar servicio Stripe para pagos
# Funciones: create_payment_intent, capture_payment, refund_payment, create_payout
import stripe
from config import settings

stripe.api_key = settings.stripe_secret_key
