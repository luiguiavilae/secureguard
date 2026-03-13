# TODO: Implementar servicio Twilio Verify para envío y verificación de OTP
# Funciones: send_otp(phone: str), verify_otp(phone: str, code: str) -> bool
from twilio.rest import Client
from config import settings

_client: Client | None = None


def get_twilio() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client
