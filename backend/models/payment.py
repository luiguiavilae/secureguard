# TODO: Definir modelos Pydantic para pagos y transacciones
# Incluir: PaymentIntent, PaymentStatus, Payout, Penalty
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"
