import logging

from config import settings

logger = logging.getLogger(__name__)


def send_sms(to: str, message: str) -> bool:
    """
    Envía un SMS al número indicado.

    En modo mock (sin credenciales reales) loggea el mensaje en consola
    y retorna True para no bloquear el flujo de desarrollo.

    Retorna True si el envío fue exitoso (o simulado), False si hubo error real.
    """
    # Normalizar: asegurar prefijo +51 para números peruanos
    if not to.startswith("+"):
        to = f"+51{to}"

    if settings.is_mock_twilio:
        logger.info(
            "[MOCK SMS] *** Credenciales Twilio no configuradas — "
            f"simulando envío a {to} | Mensaje: {message}"
        )
        return True

    try:
        from twilio.rest import Client as TwilioClient

        client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
        msg = client.messages.create(
            body=message,
            from_=settings.twilio_from_number,
            to=to,
        )
        logger.info(f"SMS enviado a {to} | SID: {msg.sid}")
        return True
    except Exception as exc:
        logger.error(f"Error enviando SMS a {to}: {exc}")
        return False
