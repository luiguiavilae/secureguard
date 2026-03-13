# TODO: Implementar configuración completa con pydantic-settings
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "SecureGuard API"
    backend_env: str = "development"
    backend_secret_key: str = ""
    backend_port: int = 8000
    allowed_origins: str = "http://localhost:3000,http://localhost:19006"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_verify_service_sid: str = ""
    twilio_from_number: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # Expo Push
    expo_access_token: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
