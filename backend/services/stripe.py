from __future__ import annotations

import logging
import uuid
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

_PLACEHOLDER_FRAGMENTS = ("your-", "placeholder", "xxxxxxx", "example", "<", "sk_test_your", "sk_live_your")


def is_mock() -> bool:
    key = settings.stripe_secret_key
    if not key:
        return True
    key_l = key.lower()
    return any(f in key_l for f in _PLACEHOLDER_FRAGMENTS)


def create_payment_intent(
    amount_cents: int,
    currency: str = "pen",
    metadata: Optional[dict] = None,
) -> dict:
    if is_mock():
        pi_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
        logger.info(
            f"💳 [MOCK] Pago simulado | id={pi_id} | "
            f"monto={amount_cents / 100:.2f} {currency.upper()}"
        )
        return {
            "id": pi_id,
            "amount": amount_cents,
            "currency": currency,
            "status": "succeeded",
            "client_secret": f"{pi_id}_secret_mock",
            "metadata": metadata or {},
        }

    import stripe as stripe_lib
    stripe_lib.api_key = settings.stripe_secret_key
    intent = stripe_lib.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        metadata=metadata or {},
    )
    return {
        "id": intent.id,
        "amount": intent.amount,
        "currency": intent.currency,
        "status": intent.status,
        "client_secret": intent.client_secret,
        "metadata": dict(intent.metadata),
    }


def create_refund(
    payment_intent_id: str,
    amount_cents: Optional[int] = None,
) -> dict:
    if is_mock():
        refund_id = f"re_mock_{uuid.uuid4().hex[:16]}"
        logger.info(
            f"💳 [MOCK] Reembolso simulado | id={refund_id} | pi={payment_intent_id}"
        )
        return {
            "id": refund_id,
            "status": "succeeded",
            "payment_intent": payment_intent_id,
        }

    import stripe as stripe_lib
    stripe_lib.api_key = settings.stripe_secret_key
    kwargs: dict = {"payment_intent": payment_intent_id}
    if amount_cents is not None:
        kwargs["amount"] = amount_cents
    refund = stripe_lib.Refund.create(**kwargs)
    return {
        "id": refund.id,
        "status": refund.status,
        "payment_intent": payment_intent_id,
    }
