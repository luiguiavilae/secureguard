from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _ascii_clean(v: str) -> str:
    """Elimina caracteres no-ASCII (ej. \\u2028) que rompen headers HTTP de supabase-py/httpx."""
    return v.encode("ascii", errors="ignore").decode("ascii").strip()


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────
    app_name: str = "SecureGuard API"
    backend_env: str = "development"
    backend_secret_key: str = "dev-secret-change-in-production-min-32-chars!!"
    backend_port: int = 8000
    allowed_origins: str = "http://localhost:3000,http://localhost:19006"

    # ── JWT ───────────────────────────────────────────────────
    jwt_expire_days: int = 30

    # ── OTP ───────────────────────────────────────────────────
    otp_expire_minutes: int = 10
    otp_rate_limit_per_hour: int = 3

    # ── Supabase ─────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # ── Twilio ───────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_verify_service_sid: str = ""
    twilio_from_number: str = "+51900000000"

    # ── Stripe ───────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # ── Expo Push ────────────────────────────────────────────
    expo_access_token: str = ""

    # ── Admin ────────────────────────────────────────────────
    admin_secret_key: str = "dev-admin-key"

    # ── Storage ──────────────────────────────────────────────
    storage_bucket_agent_docs: str = "agent-docs"

    # ── Modo mock (sin credenciales reales) ──────────────────
    @property
    def is_mock_twilio(self) -> bool:
        """
        True si las credenciales Twilio no están configuradas o son placeholders
        del .env.example (contienen 'your-', 'xxxxxxx', etc.).
        """
        _PLACEHOLDER_FRAGMENTS = ("your-", "placeholder", "xxxxxxx", "example", "<")
        sid = self.twilio_account_sid
        token = self.twilio_auth_token
        if not sid or not token:
            return True
        sid_l, token_l = sid.lower(), token.lower()
        return any(f in sid_l or f in token_l for f in _PLACEHOLDER_FRAGMENTS)

    @property
    def is_mock_supabase(self) -> bool:
        """
        True si las credenciales Supabase no están configuradas o son placeholders
        del .env.example (contienen 'your-', 'placeholder', 'xxxxxxx', etc.).
        """
        _PLACEHOLDER_FRAGMENTS = ("your-", "placeholder", "xxxxxxx", "example", "<")
        url = self.supabase_url
        key = self.supabase_service_role_key
        if not url or not key:
            return True
        url_l, key_l = url.lower(), key.lower()
        return any(f in url_l or f in key_l for f in _PLACEHOLDER_FRAGMENTS)

    @field_validator(
        "supabase_url", "supabase_anon_key", "supabase_service_role_key", "supabase_jwt_secret",
        "twilio_account_sid", "twilio_auth_token", "twilio_verify_service_sid",
        mode="before",
    )
    @classmethod
    def clean_credentials(cls, v: str) -> str:
        return _ascii_clean(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",  # ignora variables de Next.js, Expo, etc. en el .env compartido
    )


settings = Settings()
