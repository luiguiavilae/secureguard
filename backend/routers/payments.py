from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from config import settings
from middleware.auth import CurrentUser, get_current_user
from services.stripe import create_payment_intent, create_refund
from services.stripe import is_mock as is_mock_stripe
from services.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


def _require_admin(x_admin_key: Optional[str] = Header(None)) -> None:
    """Dependencia que valida la clave de admin mediante cabecera X-Admin-Key."""
    if not x_admin_key or x_admin_key != settings.admin_secret_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clave de admin inválida",
        )


# ── Modelos ──────────────────────────────────────────────────

class CreateIntentRequest(BaseModel):
    service_id: str
    metodo: str  # "STRIPE_TEST" | "YAPE_MANUAL"

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        return v


class ConfirmManualRequest(BaseModel):
    referencia: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/create-intent", status_code=status.HTTP_201_CREATED)
async def create_intent(
    body: CreateIntentRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Crea un intento de pago para un servicio CONFIRMADO.
    - STRIPE_TEST: en modo mock se marca como PAGADO automáticamente.
    - YAPE_MANUAL: queda PENDIENTE hasta confirmación del admin.
    """
    if user.tipo != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes pueden crear pagos",
        )

    metodo = body.metodo.upper()
    if metodo not in ("STRIPE_TEST", "YAPE_MANUAL"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El metodo debe ser STRIPE_TEST o YAPE_MANUAL",
        )

    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    svc_result = (
        db.table("service_requests").select("*").eq("id", body.service_id).limit(1).execute()
    )
    if not svc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    service = svc_result.data[0]
    if service["cliente_id"] != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if service["estado"] != "CONFIRMADO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El servicio debe estar CONFIRMADO para proceder con el pago",
        )

    precio_total = float(service.get("precio_total") or 0)
    amount_cents = int(precio_total * 100)

    stripe_pi_id = None
    estado_pago = "PENDIENTE"

    if metodo == "STRIPE_TEST":
        pi = create_payment_intent(
            amount_cents=amount_cents,
            currency="pen",
            metadata={"service_id": body.service_id, "cliente_id": user.user_id},
        )
        stripe_pi_id = pi["id"]
        # En mock mode o si el PI ya está succeeded, auto-confirmar
        if is_mock_stripe() or pi.get("status") == "succeeded":
            estado_pago = "PAGADO"
            db.table("service_requests").update(
                {"estado": "CONFIRMADO_PAGADO"}
            ).eq("id", body.service_id).execute()
            logger.info(f"Pago STRIPE_TEST auto-confirmado para servicio {body.service_id}")
    else:
        logger.info(
            f"💳 Pago YAPE_MANUAL registrado para servicio {body.service_id}. "
            "Pendiente de confirmación manual por admin."
        )

    payment_result = db.table("payments").insert(
        {
            "service_id": body.service_id,
            "cliente_id": user.user_id,
            "monto": precio_total,
            "metodo": metodo,
            "stripe_payment_intent_id": stripe_pi_id,
            "estado": estado_pago,
        }
    ).execute()

    payment = payment_result.data[0]
    return {
        "payment_id": payment["id"],
        "estado": estado_pago,
        "metodo": metodo,
        "monto": precio_total,
        "stripe_payment_intent_id": stripe_pi_id,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook — verifica firma HMAC y actualiza estado de pago."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if is_mock_stripe():
        logger.info("[MOCK] Webhook Stripe recibido (ignorado en modo mock)")
        return {"received": True}

    webhook_secret = settings.stripe_webhook_secret
    if not webhook_secret:
        # En producción, rechazar si no hay webhook secret configurado.
        # Aceptar sin validar sería una vulnerabilidad crítica (cualquiera podría
        # simular un pago exitoso).
        logger.error("Stripe webhook recibido pero STRIPE_WEBHOOK_SECRET no está configurado")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook no configurado correctamente",
        )

    try:
        import stripe as stripe_lib
        event = stripe_lib.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as exc:
        logger.warning(f"Stripe webhook firma inválida: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma de webhook inválida",
        )

    if event["type"] == "payment_intent.succeeded":
        pi_id = event["data"]["object"]["id"]
        try:
            db = get_supabase()
        except RuntimeError:
            return {"received": True}

        pay_result = (
            db.table("payments")
            .select("*")
            .eq("stripe_payment_intent_id", pi_id)
            .limit(1)
            .execute()
        )
        if pay_result.data:
            payment = pay_result.data[0]
            # Idempotencia: solo procesar si aún está PENDIENTE
            if payment["estado"] == "PAGADO":
                logger.info(f"Webhook duplicado ignorado para PI {pi_id} (ya procesado)")
                return {"received": True}
            db.table("payments").update({"estado": "PAGADO"}).eq("id", payment["id"]).execute()
            db.table("service_requests").update(
                {"estado": "CONFIRMADO_PAGADO"}
            ).eq("id", payment["service_id"]).execute()
            logger.info(f"Webhook: pago confirmado para servicio {payment['service_id']}")

    return {"received": True}


@router.post("/{payment_id}/confirm-manual")
async def confirm_manual(
    payment_id: str,
    body: ConfirmManualRequest,
    _admin: None = Depends(_require_admin),
):
    """Admin confirma un pago YAPE_MANUAL pendiente."""
    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    pay_result = (
        db.table("payments").select("*").eq("id", payment_id).limit(1).execute()
    )
    if not pay_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    payment = pay_result.data[0]
    if payment["estado"] != "PENDIENTE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pago ya fue procesado",
        )

    update_data: dict = {"estado": "PAGADO"}
    if body.referencia:
        update_data["referencia_yape"] = body.referencia

    db.table("payments").update(update_data).eq("id", payment_id).execute()
    db.table("service_requests").update(
        {"estado": "CONFIRMADO_PAGADO"}
    ).eq("id", payment["service_id"]).execute()

    logger.info(f"Pago YAPE manual confirmado: {payment_id} | servicio: {payment['service_id']}")
    return {"message": "Pago confirmado manualmente.", "payment_id": payment_id}


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    _admin: None = Depends(_require_admin),
):
    """Admin emite reembolso para un pago completado."""
    try:
        db = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    pay_result = (
        db.table("payments").select("*").eq("id", payment_id).limit(1).execute()
    )
    if not pay_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    payment = pay_result.data[0]
    if payment["estado"] != "PAGADO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden reembolsar pagos completados",
        )

    refund_data = create_refund(
        payment_intent_id=payment.get("stripe_payment_intent_id") or "manual",
        amount_cents=int(float(payment["monto"]) * 100),
    )

    db.table("payments").update({"estado": "REEMBOLSADO"}).eq("id", payment_id).execute()
    db.table("service_requests").update(
        {"estado": "CANCELADO"}
    ).eq("id", payment["service_id"]).execute()

    logger.info(f"Reembolso emitido: {payment_id} → {refund_data['id']}")
    return {"message": "Reembolso emitido.", "refund_id": refund_data["id"]}
