"""
Tests — /services/* y /payments/*

Flujo A: create → select-agent → agent-respond(ACEPTAR) → create-intent → start → complete
Flujo B: create → agent-respond(ACEPTAR) → EN_REVISION → client-confirm → create-intent

Todos los accesos externos (Supabase, Stripe) se mockean.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config import settings
from main import app

client = TestClient(app)

# ── Tokens de prueba ─────────────────────────────────────────

def _make_token(user_id: str, phone: str, tipo: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=1)
    return jwt.encode(
        {"user_id": user_id, "phone": phone, "tipo": tipo, "exp": expire},
        settings.backend_secret_key,
        algorithm="HS256",
    )


CLIENT_TOKEN = _make_token("cliente-001", "912345678", "CLIENTE")
AGENT_TOKEN = _make_token("agente-001", "987654321", "AGENTE")

CLIENT_HEADERS = {"Authorization": f"Bearer {CLIENT_TOKEN}"}
AGENT_HEADERS = {"Authorization": f"Bearer {AGENT_TOKEN}"}
ADMIN_HEADERS = {"X-Admin-Key": settings.admin_secret_key}

_FECHA_FUTURA = "2026-04-01T20:00:00Z"


# ── Fixtures ─────────────────────────────────────────────────

def _build_db_mock():
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


def _svc(
    service_id: str = "svc-001",
    estado: str = "ABIERTA",
    cliente_id: str = "cliente-001",
    agente_seleccionado_id=None,
    agente_asignado_id=None,
    precio_total: float = 150.0,
) -> dict:
    return {
        "id": service_id,
        "cliente_id": cliente_id,
        "estado": estado,
        "agente_seleccionado_id": agente_seleccionado_id,
        "agente_asignado_id": agente_asignado_id,
        "precio_total": precio_total,
        "agentes_requeridos": 1,
        "duracion_horas": 3,
        "tipo_servicio": "VIGILANCIA",
        "distrito": "Miraflores",
        "descripcion": "Vigilancia nocturna",
        "created_at": "2026-03-15T00:00:00+00:00",
    }


def _agent_profile(user_id: str = "agente-001", status: str = "verified") -> dict:
    return {"id": "ap-001", "user_id": user_id, "status": status}


def _payment(
    payment_id: str = "pay-001",
    service_id: str = "svc-001",
    estado: str = "PENDIENTE",
    metodo: str = "YAPE_MANUAL",
    stripe_pi: str = None,
) -> dict:
    return {
        "id": payment_id,
        "service_id": service_id,
        "cliente_id": "cliente-001",
        "monto": 150.0,
        "metodo": metodo,
        "stripe_payment_intent_id": stripe_pi,
        "estado": estado,
    }


_CREATE_BODY = {
    "descripcion": "Vigilancia nocturna",
    "distrito": "Miraflores",
    "tipo_servicio": "VIGILANCIA",
    "agentes_requeridos": 1,
    "duracion_horas": 3,
    "fecha_inicio_solicitada": _FECHA_FUTURA,
}


# ── Tests: POST /services ─────────────────────────────────────

class TestCreateService:
    def test_valid_creates_service(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),   # insert
            MagicMock(data=[{}]),        # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/", headers=CLIENT_HEADERS, json=_CREATE_BODY)
        assert resp.status_code == 201

    def test_precio_total_calculated_correctly(self):
        """precio_total = agentes * horas * 50"""
        db, q = _build_db_mock()
        captured = {}

        def capture_insert(payload):
            captured.update(payload)
            svc = {**payload, "id": "svc-new"}
            q.execute.side_effect = [MagicMock(data=[svc]), MagicMock(data=[{}])]
            return q

        q.insert.side_effect = capture_insert

        with patch("routers.services.get_supabase", return_value=db):
            client.post(
                "/services/",
                headers=CLIENT_HEADERS,
                json={**_CREATE_BODY, "agentes_requeridos": 2, "duracion_horas": 4},
            )
        # 2 × 4 × 50 = 400
        assert captured.get("precio_total") == 400

    def test_duracion_below_minimum_returns_422(self):
        resp = client.post(
            "/services/",
            headers=CLIENT_HEADERS,
            json={**_CREATE_BODY, "duracion_horas": 1},
        )
        assert resp.status_code == 422

    def test_agent_cannot_create_service(self):
        resp = client.post("/services/", headers=AGENT_HEADERS, json=_CREATE_BODY)
        assert resp.status_code == 403

    def test_unauthenticated_returns_4xx(self):
        resp = client.post("/services/", json=_CREATE_BODY)
        assert resp.status_code in (401, 403)


# ── Tests: Flujo A ────────────────────────────────────────────

class TestFlujoA:
    def test_select_agent_assigns_verified_agent(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),                       # get service
            MagicMock(data=[_agent_profile()]),             # get agent profile
            MagicMock(data=[_svc()]),                       # update service
            MagicMock(data=[{}]),                           # insert service_agents
            MagicMock(data=[{}]),                           # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/select-agent",
                headers=CLIENT_HEADERS,
                json={"agente_id": "agente-001"},
            )
        assert resp.status_code == 200
        assert "Esperando" in resp.json()["message"]

    def test_cannot_select_unverified_agent(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc()]),
            MagicMock(data=[_agent_profile(status="pending")]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/select-agent",
                headers=CLIENT_HEADERS,
                json={"agente_id": "agente-001"},
            )
        assert resp.status_code == 400

    def test_cannot_select_agent_if_not_owner(self):
        db, q = _build_db_mock()
        svc = _svc(cliente_id="otro-cliente")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/select-agent",
                headers=CLIENT_HEADERS,
                json={"agente_id": "agente-001"},
            )
        assert resp.status_code == 403

    def test_agent_respond_aceptar_flujo_a_becomes_confirmado(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA", agente_seleccionado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc]),   # get service
            MagicMock(data=[svc]),   # update to CONFIRMADO
            MagicMock(data=[{}]),    # update service_agents
            MagicMock(data=[{}]),    # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "CONFIRMADO"

    def test_agent_respond_rechazar_flujo_a_stays_abierta(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA", agente_seleccionado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[svc]),
            MagicMock(data=[{}]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,
                json={"decision": "RECHAZAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "ABIERTA"

    def test_wrong_agent_cannot_respond_flujo_a(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA", agente_seleccionado_id="agente-999")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,  # agente-001
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 403

    def test_invalid_decision_returns_422(self):
        resp = client.post(
            "/services/svc-001/agent-respond",
            headers=AGENT_HEADERS,
            json={"decision": "QUIZAS"},
        )
        assert resp.status_code == 422

    def test_start_requires_confirmado_pagado(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO", agente_asignado_id="agente-001")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/start", headers=AGENT_HEADERS)
        assert resp.status_code == 400

    def test_start_service_success(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO_PAGADO", agente_asignado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[svc]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/start", headers=AGENT_HEADERS)
        assert resp.status_code == 200
        assert resp.json()["estado"] == "EN_CURSO"

    def test_complete_service_success(self):
        db, q = _build_db_mock()
        svc = _svc(estado="EN_CURSO", agente_asignado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[svc]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/complete", headers=AGENT_HEADERS)
        assert resp.status_code == 200
        assert resp.json()["estado"] == "COMPLETADO"

    def test_complete_requires_en_curso(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO_PAGADO", agente_asignado_id="agente-001")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/complete", headers=AGENT_HEADERS)
        assert resp.status_code == 400

    def test_flujo_a_full_flow(self):
        """Flujo A completo: CONFIRMADO → pago mock → CONFIRMADO_PAGADO → EN_CURSO → COMPLETADO"""
        db, q = _build_db_mock()

        # create-intent (STRIPE_TEST mock)
        svc_confirmado = _svc(estado="CONFIRMADO", agente_asignado_id="agente-001")
        pay_rec = _payment(metodo="STRIPE_TEST", stripe_pi="pi_mock_123", estado="PAGADO")
        q.execute.side_effect = [
            MagicMock(data=[svc_confirmado]),
            MagicMock(data=[svc_confirmado]),   # update to CONFIRMADO_PAGADO
            MagicMock(data=[pay_rec]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            with patch("routers.payments.is_mock_stripe", return_value=True):
                with patch(
                    "routers.payments.create_payment_intent",
                    return_value={"id": "pi_mock_123", "status": "succeeded"},
                ):
                    pay_resp = client.post(
                        "/payments/create-intent",
                        headers=CLIENT_HEADERS,
                        json={"service_id": "svc-001", "metodo": "STRIPE_TEST"},
                    )
        assert pay_resp.status_code == 201
        assert pay_resp.json()["estado"] == "PAGADO"

        # start
        svc_pagado = _svc(estado="CONFIRMADO_PAGADO", agente_asignado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc_pagado]),
            MagicMock(data=[svc_pagado]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            start_resp = client.post("/services/svc-001/start", headers=AGENT_HEADERS)
        assert start_resp.status_code == 200

        # complete
        svc_en_curso = _svc(estado="EN_CURSO", agente_asignado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc_en_curso]),
            MagicMock(data=[svc_en_curso]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            complete_resp = client.post("/services/svc-001/complete", headers=AGENT_HEADERS)
        assert complete_resp.status_code == 200
        assert complete_resp.json()["estado"] == "COMPLETADO"


# ── Tests: Flujo B ────────────────────────────────────────────

class TestFlujoB:
    def test_agent_apply_open_service_becomes_en_revision(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA", agente_seleccionado_id=None)
        # Sequence (single agent Flujo B):
        # 1. get service, 2. check existing agent (none), 3. insert service_agents,
        # 4. update service EN_REVISION, 5. get accepted agents (for leader),
        # 6. update leader, 7. log event
        q.execute.side_effect = [
            MagicMock(data=[svc]),                       # get service
            MagicMock(data=[]),                          # check existing (none)
            MagicMock(data=[{}]),                        # insert service_agents
            MagicMock(data=[svc]),                       # update service
            MagicMock(data=[{"agente_id": "agente-001"}]),  # get accepted agents
            MagicMock(data=[{}]),                        # update leader
            MagicMock(data=[{}]),                        # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "EN_REVISION"

    def test_client_confirm_becomes_confirmado(self):
        db, q = _build_db_mock()
        svc = _svc(estado="EN_REVISION", agente_seleccionado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[svc]),
            MagicMock(data=[{}]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/client-confirm", headers=CLIENT_HEADERS)
        assert resp.status_code == 200
        assert resp.json()["estado"] == "CONFIRMADO"
        assert resp.json()["agente_id"] == "agente-001"

    def test_client_confirm_wrong_state_returns_400(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post("/services/svc-001/client-confirm", headers=CLIENT_HEADERS)
        assert resp.status_code == 400

    def test_only_client_can_confirm(self):
        resp = client.post("/services/svc-001/client-confirm", headers=AGENT_HEADERS)
        assert resp.status_code == 403

    def test_agent_rechazar_flujo_b_stays_abierta(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA", agente_seleccionado_id=None)
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,
                json={"decision": "RECHAZAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "ABIERTA"

    def test_flujo_b_full_flow(self):
        """Flujo B completo: create → agent-apply → client-confirm → YAPE → admin-confirm"""
        db, q = _build_db_mock()

        # 1. Create service
        q.execute.side_effect = [MagicMock(data=[_svc()]), MagicMock(data=[{}])]
        with patch("routers.services.get_supabase", return_value=db):
            create_resp = client.post("/services/", headers=CLIENT_HEADERS, json=_CREATE_BODY)
        assert create_resp.status_code == 201

        # 2. Agent applies (single-agent Flujo B → EN_REVISION directo)
        svc_abierta = _svc(estado="ABIERTA", agente_seleccionado_id=None)
        q.execute.side_effect = [
            MagicMock(data=[svc_abierta]),                       # get service
            MagicMock(data=[]),                                  # check existing (none)
            MagicMock(data=[{}]),                                # insert service_agents
            MagicMock(data=[svc_abierta]),                       # update service
            MagicMock(data=[{"agente_id": "agente-001"}]),       # get accepted agents
            MagicMock(data=[{}]),                                # update leader
            MagicMock(data=[{}]),                                # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            apply_resp = client.post(
                "/services/svc-001/agent-respond",
                headers=AGENT_HEADERS,
                json={"decision": "ACEPTAR"},
            )
        assert apply_resp.status_code == 200
        assert apply_resp.json()["estado"] == "EN_REVISION"

        # 3. Client confirms
        svc_en_revision = _svc(estado="EN_REVISION", agente_seleccionado_id="agente-001")
        q.execute.side_effect = [
            MagicMock(data=[svc_en_revision]),
            MagicMock(data=[svc_en_revision]),
            MagicMock(data=[{}]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.services.get_supabase", return_value=db):
            confirm_resp = client.post("/services/svc-001/client-confirm", headers=CLIENT_HEADERS)
        assert confirm_resp.status_code == 200
        assert confirm_resp.json()["estado"] == "CONFIRMADO"

        # 4. YAPE payment (stays PENDIENTE)
        svc_confirmado = _svc(estado="CONFIRMADO", agente_asignado_id="agente-001")
        pay_rec = _payment(estado="PENDIENTE", metodo="YAPE_MANUAL")
        q.execute.side_effect = [
            MagicMock(data=[svc_confirmado]),
            MagicMock(data=[pay_rec]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            pay_resp = client.post(
                "/payments/create-intent",
                headers=CLIENT_HEADERS,
                json={"service_id": "svc-001", "metodo": "YAPE_MANUAL"},
            )
        assert pay_resp.status_code == 201
        assert pay_resp.json()["estado"] == "PENDIENTE"

        # 5. Admin confirms manual payment
        q.execute.side_effect = [
            MagicMock(data=[pay_rec]),
            MagicMock(data=[pay_rec]),
            MagicMock(data=[svc_confirmado]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            admin_resp = client.post(
                f"/payments/{pay_rec['id']}/confirm-manual",
                headers=ADMIN_HEADERS,
                json={"referencia": "YAPE-ABC-123"},
            )
        assert admin_resp.status_code == 200


# ── Tests: /payments ─────────────────────────────────────────

class TestPayments:
    def test_stripe_mock_auto_confirms(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO")
        pay_rec = _payment(metodo="STRIPE_TEST", stripe_pi="pi_mock_abc", estado="PAGADO")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[svc]),
            MagicMock(data=[pay_rec]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            with patch("routers.payments.is_mock_stripe", return_value=True):
                with patch(
                    "routers.payments.create_payment_intent",
                    return_value={"id": "pi_mock_abc", "status": "succeeded"},
                ):
                    resp = client.post(
                        "/payments/create-intent",
                        headers=CLIENT_HEADERS,
                        json={"service_id": "svc-001", "metodo": "STRIPE_TEST"},
                    )
        assert resp.status_code == 201
        assert resp.json()["estado"] == "PAGADO"
        assert resp.json()["stripe_payment_intent_id"] == "pi_mock_abc"

    def test_yape_manual_stays_pending(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO")
        pay_rec = _payment(estado="PENDIENTE")
        q.execute.side_effect = [
            MagicMock(data=[svc]),
            MagicMock(data=[pay_rec]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post(
                "/payments/create-intent",
                headers=CLIENT_HEADERS,
                json={"service_id": "svc-001", "metodo": "YAPE_MANUAL"},
            )
        assert resp.status_code == 201
        assert resp.json()["estado"] == "PENDIENTE"
        assert resp.json()["stripe_payment_intent_id"] is None

    def test_cannot_pay_unconfirmed_service(self):
        db, q = _build_db_mock()
        svc = _svc(estado="ABIERTA")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post(
                "/payments/create-intent",
                headers=CLIENT_HEADERS,
                json={"service_id": "svc-001", "metodo": "STRIPE_TEST"},
            )
        assert resp.status_code == 400

    def test_invalid_metodo_returns_4xx(self):
        db, q = _build_db_mock()
        svc = _svc(estado="CONFIRMADO")
        q.execute.side_effect = [MagicMock(data=[svc])]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post(
                "/payments/create-intent",
                headers=CLIENT_HEADERS,
                json={"service_id": "svc-001", "metodo": "BITCOIN"},
            )
        assert resp.status_code in (400, 422)

    def test_confirm_manual_requires_admin_key(self):
        resp = client.post(
            "/payments/pay-001/confirm-manual",
            headers={"X-Admin-Key": "wrong-key"},
            json={},
        )
        assert resp.status_code == 403

    def test_confirm_manual_no_key_returns_403(self):
        resp = client.post("/payments/pay-001/confirm-manual", json={})
        assert resp.status_code == 403

    def test_confirm_manual_success(self):
        db, q = _build_db_mock()
        pay_rec = _payment(estado="PENDIENTE")
        q.execute.side_effect = [
            MagicMock(data=[pay_rec]),
            MagicMock(data=[pay_rec]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post(
                "/payments/pay-001/confirm-manual",
                headers=ADMIN_HEADERS,
                json={"referencia": "YAPE-XYZ-789"},
            )
        assert resp.status_code == 200
        assert resp.json()["payment_id"] == "pay-001"

    def test_confirm_already_paid_returns_400(self):
        db, q = _build_db_mock()
        pay_rec = _payment(estado="PAGADO")
        q.execute.side_effect = [MagicMock(data=[pay_rec])]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post(
                "/payments/pay-001/confirm-manual",
                headers=ADMIN_HEADERS,
                json={},
            )
        assert resp.status_code == 400

    def test_refund_requires_admin_key(self):
        resp = client.post("/payments/pay-001/refund", headers={"X-Admin-Key": "bad"})
        assert resp.status_code == 403

    def test_refund_success(self):
        db, q = _build_db_mock()
        pay_rec = _payment(estado="PAGADO", stripe_pi="pi_mock_xyz")
        q.execute.side_effect = [
            MagicMock(data=[pay_rec]),
            MagicMock(data=[pay_rec]),
            MagicMock(data=[{}]),
        ]
        with patch("routers.payments.get_supabase", return_value=db):
            with patch(
                "routers.payments.create_refund",
                return_value={
                    "id": "re_mock_abc",
                    "status": "succeeded",
                    "payment_intent": "pi_mock_xyz",
                },
            ):
                resp = client.post("/payments/pay-001/refund", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        assert "refund_id" in resp.json()

    def test_refund_not_paid_returns_400(self):
        db, q = _build_db_mock()
        pay_rec = _payment(estado="PENDIENTE")
        q.execute.side_effect = [MagicMock(data=[pay_rec])]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post("/payments/pay-001/refund", headers=ADMIN_HEADERS)
        assert resp.status_code == 400

    def test_refund_not_found_returns_404(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [MagicMock(data=[])]
        with patch("routers.payments.get_supabase", return_value=db):
            resp = client.post("/payments/pay-999/refund", headers=ADMIN_HEADERS)
        assert resp.status_code == 404


# ── Tests: GET /services ──────────────────────────────────────

class TestGetServices:
    def test_get_service_by_id(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [MagicMock(data=[_svc()])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/svc-001", headers=CLIENT_HEADERS)
        assert resp.status_code == 200
        assert resp.json()["id"] == "svc-001"

    def test_get_service_not_found_returns_404(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [MagicMock(data=[])]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/nonexistent", headers=CLIENT_HEADERS)
        assert resp.status_code == 404

    def test_get_open_services_only_for_agents(self):
        resp = client.get("/services/open", headers=CLIENT_HEADERS)
        assert resp.status_code == 403

    def test_get_open_services_as_agent(self):
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[_svc(), _svc(service_id="svc-002")])
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/open", headers=AGENT_HEADERS)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_my_active_filters_completed(self):
        """COMPLETADO no debe aparecer en my-active."""
        db, q = _build_db_mock()
        q.execute.side_effect = [
            MagicMock(data=[
                _svc(estado="EN_CURSO"),
                _svc(estado="COMPLETADO", service_id="svc-002"),
            ])
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/my-active", headers=CLIENT_HEADERS)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["estado"] == "EN_CURSO"
