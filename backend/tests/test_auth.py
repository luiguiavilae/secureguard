"""
Tests — POST /auth/send-otp y POST /auth/verify-otp

Todos los accesos externos (Supabase, Twilio) se mockean.
No se requiere base de datos ni credenciales reales.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Fixtures ─────────────────────────────────────────────────

def _build_db_mock() -> tuple[MagicMock, MagicMock]:
    """
    Construye un mock del cliente Supabase que soporta method chaining.
    Retorna (db, query) donde `query` es el objeto que recibe todas las
    llamadas encadenadas (.select, .insert, .update, .eq, .gte, .execute…).
    """
    db = MagicMock()
    q = MagicMock()
    db.table.return_value = q
    q.select.return_value = q
    q.insert.return_value = q
    q.update.return_value = q
    q.eq.return_value = q
    q.gte.return_value = q
    q.lte.return_value = q
    q.order.return_value = q
    q.limit.return_value = q
    return db, q


def _otp_record(*, used: bool = False, expired: bool = False) -> dict:
    if expired:
        expires_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    else:
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=9)).isoformat()
    return {
        "id": "otp-uuid-001",
        "phone": "912345678",
        "code": "654321",
        "expires_at": expires_at,
        "used": used,
    }


def _user_record(tipo: str = "CLIENTE") -> dict:
    return {
        "id": "user-uuid-abc",
        "phone": "912345678",
        "tipo": tipo,
        "estado": "ACTIVO",
    }


# ── Tests: POST /auth/send-otp ────────────────────────────────

class TestSendOTP:
    def test_valid_phone_returns_200(self):
        """Teléfono válido → 200 con expires_in=600."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(count=0, data=[]),                              # attempts count
            MagicMock(data=[{"id": "otp-1", "phone": "912345678"}]), # otp insert
            MagicMock(data=[{"id": "att-1"}]),                        # attempt insert
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            with patch("routers.auth.send_sms", return_value=True):
                resp = client.post("/auth/send-otp", json={"phone": "912345678"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "OTP enviado correctamente"
        assert body["expires_in"] == 600

    def test_phone_with_prefix_51_is_normalized(self):
        """El prefijo +51 debe eliminarse antes de validar."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(count=0, data=[]),
            MagicMock(data=[{"id": "otp-2"}]),
            MagicMock(data=[{"id": "att-2"}]),
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            with patch("routers.auth.send_sms", return_value=True):
                resp = client.post("/auth/send-otp", json={"phone": "+51912345678"})

        assert resp.status_code == 200

    def test_phone_not_starting_with_9_returns_422(self):
        """Número que no empieza con 9 → 422 Unprocessable Entity."""
        resp = client.post("/auth/send-otp", json={"phone": "812345678"})
        assert resp.status_code == 422

    def test_phone_too_short_returns_422(self):
        """Número con menos de 9 dígitos → 422."""
        resp = client.post("/auth/send-otp", json={"phone": "91234"})
        assert resp.status_code == 422

    def test_phone_too_long_returns_422(self):
        """Número con más de 9 dígitos → 422."""
        resp = client.post("/auth/send-otp", json={"phone": "9123456789"})
        assert resp.status_code == 422

    def test_rate_limit_3_attempts_per_hour(self):
        """Cuarto intento en menos de 1 hora → 429 Too Many Requests."""
        db, q = _build_db_mock()
        # Simular que ya hay 3 intentos registrados
        q.execute.return_value = MagicMock(count=3, data=[])

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post("/auth/send-otp", json={"phone": "912345678"})

        assert resp.status_code == 429
        assert "Demasiados intentos" in resp.json()["detail"]

    def test_rate_limit_exactly_3_is_blocked(self):
        """Exactamente 3 intentos previos debe bloquearse (límite >= 3)."""
        db, q = _build_db_mock()
        q.execute.return_value = MagicMock(count=3, data=[])

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post("/auth/send-otp", json={"phone": "912345678"})

        assert resp.status_code == 429

    def test_sms_failure_returns_503(self):
        """Si el SMS no se puede enviar → 503."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(count=0, data=[]),
            MagicMock(data=[{"id": "otp-3"}]),
            MagicMock(data=[{"id": "att-3"}]),
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            with patch("routers.auth.send_sms", return_value=False):
                resp = client.post("/auth/send-otp", json={"phone": "912345678"})

        assert resp.status_code == 503


# ── Tests: POST /auth/verify-otp ─────────────────────────────

class TestVerifyOTP:
    def test_valid_otp_new_user_returns_token(self):
        """OTP válido y usuario nuevo → JWT + is_new_user=True."""
        db, q = _build_db_mock()
        otp = _otp_record(used=False, expired=False)
        user = _user_record("CLIENTE")
        q.execute.side_effect = [
            MagicMock(data=[otp]),   # buscar OTP
            MagicMock(data=[otp]),   # marcar como usado
            MagicMock(data=[]),      # buscar user → no existe
            MagicMock(data=[user]),  # crear user
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "654321", "tipo": "CLIENTE"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["is_new_user"] is True
        assert body["tipo"] == "CLIENTE"
        assert body["user_id"] == "user-uuid-abc"

    def test_valid_otp_existing_user_no_duplicate(self):
        """OTP válido con usuario existente → is_new_user=False, sin INSERT de usuario."""
        db, q = _build_db_mock()
        otp = _otp_record(used=False, expired=False)
        user = _user_record("AGENTE")
        q.execute.side_effect = [
            MagicMock(data=[otp]),   # buscar OTP
            MagicMock(data=[otp]),   # marcar como usado
            MagicMock(data=[user]),  # buscar user → existe
            # sin 4to call (no se inserta usuario)
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "654321", "tipo": "AGENTE"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["is_new_user"] is False
        assert body["tipo"] == "AGENTE"

    def test_invalid_otp_code_returns_400(self):
        """OTP que no existe en la base de datos → 400."""
        db, q = _build_db_mock()
        q.execute.return_value = MagicMock(data=[])  # OTP no encontrado

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "000000", "tipo": "CLIENTE"},
            )

        assert resp.status_code == 400
        assert "inválido" in resp.json()["detail"].lower()

    def test_expired_otp_returns_400(self):
        """OTP con expires_at en el pasado → 400 con mensaje 'expirado'."""
        db, q = _build_db_mock()
        otp = _otp_record(used=False, expired=True)
        q.execute.return_value = MagicMock(data=[otp])

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "654321", "tipo": "CLIENTE"},
            )

        assert resp.status_code == 400
        assert "expirado" in resp.json()["detail"].lower()

    def test_already_used_otp_returns_400(self):
        """OTP marcado como usado → 400 con mensaje 'utilizado'."""
        db, q = _build_db_mock()
        otp = _otp_record(used=True, expired=False)
        q.execute.return_value = MagicMock(data=[otp])

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "654321", "tipo": "CLIENTE"},
            )

        assert resp.status_code == 400
        assert "utilizado" in resp.json()["detail"].lower()

    def test_otp_format_non_digits_returns_422(self):
        """OTP con caracteres no numéricos → 422."""
        resp = client.post(
            "/auth/verify-otp",
            json={"phone": "912345678", "otp": "12AB56", "tipo": "CLIENTE"},
        )
        assert resp.status_code == 422

    def test_otp_too_short_returns_422(self):
        """OTP con menos de 6 dígitos → 422."""
        resp = client.post(
            "/auth/verify-otp",
            json={"phone": "912345678", "otp": "1234", "tipo": "CLIENTE"},
        )
        assert resp.status_code == 422

    def test_invalid_tipo_returns_422(self):
        """tipo diferente a CLIENTE o AGENTE → 422."""
        resp = client.post(
            "/auth/verify-otp",
            json={"phone": "912345678", "otp": "123456", "tipo": "ADMIN"},
        )
        assert resp.status_code == 422

    def test_returned_token_is_decodable(self):
        """El JWT retornado puede decodificarse con el secret key."""
        from jose import jwt as jose_jwt
        from config import settings

        db, q = _build_db_mock()
        otp = _otp_record(used=False, expired=False)
        user = _user_record("CLIENTE")
        q.execute.side_effect = [
            MagicMock(data=[otp]),
            MagicMock(data=[otp]),
            MagicMock(data=[]),
            MagicMock(data=[user]),
        ]

        with patch("routers.auth.get_supabase", return_value=db):
            resp = client.post(
                "/auth/verify-otp",
                json={"phone": "912345678", "otp": "654321", "tipo": "CLIENTE"},
            )

        token = resp.json()["access_token"]
        payload = jose_jwt.decode(token, settings.backend_secret_key, algorithms=["HS256"])
        assert payload["user_id"] == "user-uuid-abc"
        assert payload["phone"] == "912345678"
        assert payload["tipo"] == "CLIENTE"
