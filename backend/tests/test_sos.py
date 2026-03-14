"""
Tests — POST /services/{id}/sos

Casos:
  - SOS cliente: registra incidente correctamente
  - SOS agente: registra incidente correctamente
  - Usuario no relacionado → 403
  - Servicio inexistente → 404
  - Tipo inválido → 422
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config import settings
from main import app

client = TestClient(app)


# ── Tokens ────────────────────────────────────────────────────

def _make_token(user_id: str, phone: str, tipo: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=1)
    return jwt.encode(
        {"user_id": user_id, "phone": phone, "tipo": tipo, "exp": expire},
        settings.backend_secret_key,
        algorithm="HS256",
    )


CLIENT_TOKEN = _make_token("cliente-001", "912345678", "CLIENTE")
AGENT_TOKEN = _make_token("agente-001", "987654321", "AGENTE")
OTHER_TOKEN = _make_token("usuario-999", "999999999", "CLIENTE")

CLIENT_H = {"Authorization": f"Bearer {CLIENT_TOKEN}"}
AGENT_H = {"Authorization": f"Bearer {AGENT_TOKEN}"}
OTHER_H = {"Authorization": f"Bearer {OTHER_TOKEN}"}


# ── Fixtures ──────────────────────────────────────────────────

def _build_db_mock():
    db = MagicMock()
    q = MagicMock()
    db.table.return_value = q
    q.select.return_value = q
    q.insert.return_value = q
    q.update.return_value = q
    q.eq.return_value = q
    q.limit.return_value = q
    return db, q


def _svc(
    service_id: str = "svc-001",
    estado: str = "EN_CURSO",
    cliente_id: str = "cliente-001",
    agente_asignado_id: str = "agente-001",
) -> dict:
    return {
        "id": service_id,
        "cliente_id": cliente_id,
        "agente_asignado_id": agente_asignado_id,
        "estado": estado,
        "agentes_requeridos": 1,
        "cupos_cubiertos": 1,
        "precio_total": 150.0,
        "duracion_horas": 3,
        "tipo_servicio": "VIGILANCIA",
        "distrito": "Miraflores",
        "descripcion": "Vigilancia nocturna",
    }


def _incidente(incidente_id: str = "inc-001") -> dict:
    return {
        "id": incidente_id,
        "service_id": "svc-001",
        "tipo": "SOS",
        "subtipo": "CLIENTE",
        "descripcion": "Situación de emergencia",
        "reportado_por": "cliente-001",
    }


# ── Tests: SOS cliente ────────────────────────────────────────

class TestSOSCliente:
    def test_cliente_sos_registers_incident(self):
        """Cliente activo puede activar SOS y recibe confirmación."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),          # get service
            MagicMock(data=[_incidente()]),     # insert incident
            MagicMock(data=[{}]),              # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=CLIENT_H,
                json={
                    "tipo": "CLIENTE",
                    "descripcion": "Individuo sospechoso en la propiedad",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["incidente_id"] == "inc-001"
        assert "SOS registrado" in data["mensaje"]
        assert "Ayuda en camino" in data["mensaje"]

    def test_cliente_sos_lowercase_tipo_accepted(self):
        """El tipo en minúsculas también es válido (se normaliza)."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[_incidente()]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=CLIENT_H,
                json={"tipo": "cliente", "descripcion": "Emergencia"},
            )
        assert resp.status_code == 200

    def test_cliente_sos_returns_incidente_id(self):
        """La respuesta incluye el incidente_id del registro creado."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[{"id": "INC-XYZ-001"}]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=CLIENT_H,
                json={"tipo": "CLIENTE", "descripcion": "Robo"},
            )
        assert resp.status_code == 200
        assert resp.json()["incidente_id"] == "INC-XYZ-001"


# ── Tests: SOS agente ─────────────────────────────────────────

class TestSOSAgente:
    def test_agente_sos_registers_incident(self):
        """Agente asignado puede activar SOS y recibe confirmación."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[_incidente(incidente_id="inc-agente-001")]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=AGENT_H,
                json={
                    "tipo": "AGENTE",
                    "descripcion": "Agresión física al agente de seguridad",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["incidente_id"] == "inc-agente-001"
        assert "SOS registrado" in data["mensaje"]

    def test_agente_sos_tipo_agente_accepted(self):
        """Tipo AGENTE es aceptado correctamente."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[_incidente()]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=AGENT_H,
                json={"tipo": "AGENTE", "descripcion": "Amenaza con arma"},
            )
        assert resp.status_code == 200


# ── Tests: casos de error ─────────────────────────────────────

class TestSOSErrors:
    def test_unrelated_user_cannot_sos(self):
        """Usuario no relacionado con el servicio recibe 403."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc(cliente_id="cliente-001", agente_asignado_id="agente-001")])
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=OTHER_H,  # usuario-999 no es cliente ni agente del servicio
                json={"tipo": "CLIENTE", "descripcion": "Test"},
            )
        assert resp.status_code == 403

    def test_nonexistent_service_returns_404(self):
        """Servicio inexistente devuelve 404."""
        db, q = _build_db_mock()
        q.execute.side_effect = [MagicMock(data=[])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/nonexistent/sos",
                headers=CLIENT_H,
                json={"tipo": "CLIENTE", "descripcion": "Emergencia"},
            )
        assert resp.status_code == 404

    def test_invalid_tipo_returns_422(self):
        """Tipo inválido (no CLIENTE/AGENTE) devuelve 422."""
        resp = client.post(
            "/services/svc-001/sos",
            headers=CLIENT_H,
            json={"tipo": "POLICIA", "descripcion": "Emergencia"},
        )
        assert resp.status_code == 422

    def test_unauthenticated_returns_4xx(self):
        """Sin token devuelve 401 o 403."""
        resp = client.post(
            "/services/svc-001/sos",
            json={"tipo": "CLIENTE", "descripcion": "Emergencia"},
        )
        assert resp.status_code in (401, 403)

    def test_missing_descripcion_returns_422(self):
        """Falta descripción → 422."""
        resp = client.post(
            "/services/svc-001/sos",
            headers=CLIENT_H,
            json={"tipo": "CLIENTE"},
        )
        assert resp.status_code == 422

    def test_sos_without_incidente_data_still_returns_message(self):
        """Si la BD no retorna id del incidente, la respuesta igual incluye el mensaje."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[]),    # insert devuelve lista vacía
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/sos",
                headers=CLIENT_H,
                json={"tipo": "CLIENTE", "descripcion": "Emergencia"},
            )
        assert resp.status_code == 200
        assert resp.json()["incidente_id"] is None
        assert "SOS registrado" in resp.json()["mensaje"]
