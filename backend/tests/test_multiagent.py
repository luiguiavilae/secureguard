"""
Tests — Multi-agente

Flujo B con agentes_requeridos > 1:
  - 3 agentes aceptan → cuórum → EN_REVISION
  - Designación de líder por criterios / mayor score
  - Timeout 4h → vuelve a ABIERTA
  - Precio: agentes × horas × 50
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
AGENT1_TOKEN = _make_token("agente-001", "911111111", "AGENTE")
AGENT2_TOKEN = _make_token("agente-002", "922222222", "AGENTE")
AGENT3_TOKEN = _make_token("agente-003", "933333333", "AGENTE")

CLIENT_H = {"Authorization": f"Bearer {CLIENT_TOKEN}"}
AGENT1_H = {"Authorization": f"Bearer {AGENT1_TOKEN}"}
AGENT2_H = {"Authorization": f"Bearer {AGENT2_TOKEN}"}
AGENT3_H = {"Authorization": f"Bearer {AGENT3_TOKEN}"}

_FECHA_FUTURA = "2026-04-01T20:00:00Z"
# updated_at "fresh" — 30 minutos atrás, nunca dispara el timeout de 4h
_FRESH_UPDATED_AT = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()


# ── Fixtures ──────────────────────────────────────────────────

def _build_db_mock():
    db = MagicMock()
    q = MagicMock()
    db.table.return_value = q
    q.select.return_value = q
    q.insert.return_value = q
    q.update.return_value = q
    q.eq.return_value = q
    q.in_.return_value = q
    q.gte.return_value = q
    q.lte.return_value = q
    q.order.return_value = q
    q.limit.return_value = q
    return db, q


def _svc(
    service_id: str = "svc-multi",
    estado: str = "ABIERTA",
    cliente_id: str = "cliente-001",
    agentes_requeridos: int = 3,
    cupos_cubiertos: int = 0,
    agente_seleccionado_id=None,
    agente_asignado_id=None,
    updated_at: str = _FRESH_UPDATED_AT,
) -> dict:
    return {
        "id": service_id,
        "cliente_id": cliente_id,
        "estado": estado,
        "agente_seleccionado_id": agente_seleccionado_id,
        "agente_asignado_id": agente_asignado_id,
        "precio_total": agentes_requeridos * 3 * 50,
        "agentes_requeridos": agentes_requeridos,
        "cupos_cubiertos": cupos_cubiertos,
        "duracion_horas": 3,
        "tipo_servicio": "VIGILANCIA",
        "distrito": "Miraflores",
        "descripcion": "Vigilancia multi-agente",
        "created_at": "2026-03-14T08:00:00+00:00",
        "updated_at": updated_at,
    }


def _profile(user_id: str, score: int = 80, servicios: int = 25, rating: float = 4.6, penal: int = 0) -> dict:
    return {
        "user_id": user_id,
        "score": score,
        "servicios_completados": servicios,
        "rating_avg": rating,
        "penalizaciones_activas": penal,
    }


# ── Tests: creación multi-agente ──────────────────────────────

class TestCreateMultiAgent:
    def test_precio_3_agentes_3h(self):
        """precio_total = 3 × 3 × 50 = 450"""
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
                headers=CLIENT_H,
                json={
                    "descripcion": "Vigilancia nocturna",
                    "distrito": "Miraflores",
                    "tipo_servicio": "VIGILANCIA",
                    "agentes_requeridos": 3,
                    "duracion_horas": 3,
                    "fecha_inicio_solicitada": _FECHA_FUTURA,
                },
            )
        assert captured.get("precio_total") == 450
        assert captured.get("agentes_requeridos") == 3
        assert captured.get("cupos_cubiertos") == 0

    def test_requires_3_acceptances(self):
        """Con 3 agentes requeridos, la 1ª y 2ª aceptación → PARCIAL, no EN_REVISION."""
        db, q = _build_db_mock()

        # 1st agent applies
        svc_abierta = _svc(agentes_requeridos=3, cupos_cubiertos=0)
        q.execute.side_effect = [
            MagicMock(data=[svc_abierta]),   # get service
            MagicMock(data=[]),              # check existing agent (none)
            MagicMock(data=[{}]),            # insert service_agents
            MagicMock(data=[{}]),            # update service (PARCIAL)
            MagicMock(data=[{}]),            # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-multi/agent-respond",
                headers=AGENT1_H,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "PARCIAL"
        assert resp.json()["cupos_cubiertos"] == 1
        assert resp.json()["cupos_total"] == 3

    def test_second_agent_still_parcial(self):
        """2ª aceptación: PARCIAL con cupos_cubiertos=2."""
        db, q = _build_db_mock()
        svc_parcial = _svc(agentes_requeridos=3, cupos_cubiertos=1, estado="PARCIAL")
        q.execute.side_effect = [
            MagicMock(data=[svc_parcial]),
            MagicMock(data=[]),              # no duplicate
            MagicMock(data=[{}]),            # insert
            MagicMock(data=[{}]),            # update PARCIAL
            MagicMock(data=[{}]),            # log
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-multi/agent-respond",
                headers=AGENT2_H,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "PARCIAL"
        assert resp.json()["cupos_cubiertos"] == 2

    def test_third_agent_completes_quorum(self):
        """3ª aceptación → cuórum completo → EN_REVISION."""
        db, q = _build_db_mock()
        svc_parcial = _svc(agentes_requeridos=3, cupos_cubiertos=2, estado="PARCIAL")
        accepted_agents = [
            {"agente_id": "agente-001"},
            {"agente_id": "agente-002"},
            {"agente_id": "agente-003"},
        ]
        profiles = [
            _profile("agente-001", score=85),
            _profile("agente-002", score=75),
            _profile("agente-003", score=90),
        ]
        q.execute.side_effect = [
            MagicMock(data=[svc_parcial]),      # get service
            MagicMock(data=[]),                 # check existing (not duplicate)
            MagicMock(data=[{}]),               # insert service_agents
            MagicMock(data=[{}]),               # update service to EN_REVISION
            MagicMock(data=accepted_agents),    # get accepted agents
            MagicMock(data=profiles),           # get agent profiles (for leader)
            MagicMock(data=[{}]),               # update leader
            MagicMock(data=[{}]),               # log event
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-multi/agent-respond",
                headers=AGENT3_H,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "EN_REVISION"
        assert resp.json()["cupos_cubiertos"] == 3
        assert resp.json()["cupos_total"] == 3


# ── Tests: designación de líder ───────────────────────────────

class TestLeaderDesignation:
    def test_leader_is_highest_score_among_qualified(self):
        """Líder es el de mayor score entre los que cumplen todos los criterios."""
        from routers.services import _designate_leader

        db, q = _build_db_mock()
        profiles = [
            _profile("agente-001", score=80, servicios=25, rating=4.6, penal=0),
            _profile("agente-002", score=75, servicios=30, rating=4.7, penal=0),
            _profile("agente-003", score=90, servicios=22, rating=4.8, penal=0),
        ]
        q.execute.side_effect = [
            MagicMock(data=profiles),   # profiles query
            MagicMock(data=[{}]),        # update leader
        ]

        leader = _designate_leader(db, "svc-test", ["agente-001", "agente-002", "agente-003"])
        assert leader == "agente-003"  # score 90 is highest among qualified

    def test_leader_fallback_to_highest_score_if_none_qualified(self):
        """Si nadie cumple todos los criterios, se elige el de mayor score."""
        from routers.services import _designate_leader

        db, q = _build_db_mock()
        # None qualify: agente-001 has low score, agente-002 has penal
        profiles = [
            _profile("agente-001", score=60, servicios=25, rating=4.6, penal=0),  # score < 70
            _profile("agente-002", score=85, servicios=30, rating=4.7, penal=1),  # has penalty
        ]
        q.execute.side_effect = [
            MagicMock(data=profiles),
            MagicMock(data=[{}]),
        ]

        leader = _designate_leader(db, "svc-test", ["agente-001", "agente-002"])
        assert leader == "agente-002"  # highest score fallback

    def test_single_agent_is_always_leader(self):
        """Con un solo agente, siempre es el líder sin consultar perfiles."""
        from routers.services import _designate_leader

        db, q = _build_db_mock()
        q.execute.side_effect = [MagicMock(data=[{}])]  # update leader

        leader = _designate_leader(db, "svc-test", ["agente-001"])
        assert leader == "agente-001"

    def test_leader_criteria_requires_all_conditions(self):
        """Un agente que cumple todos los criterios desplaza al de mayor score bruto."""
        from routers.services import _designate_leader

        db, q = _build_db_mock()
        profiles = [
            # agente-001: score alto pero tiene penalización → no califica
            _profile("agente-001", score=95, servicios=50, rating=4.9, penal=1),
            # agente-002: score más bajo pero cumple TODO
            _profile("agente-002", score=72, servicios=25, rating=4.5, penal=0),
        ]
        q.execute.side_effect = [
            MagicMock(data=profiles),
            MagicMock(data=[{}]),
        ]

        leader = _designate_leader(db, "svc-test", ["agente-001", "agente-002"])
        assert leader == "agente-002"  # único que califica


# ── Tests: timeout de cuórum ──────────────────────────────────

class TestCuorumTimeout:
    def test_timeout_resets_parcial_to_abierta(self):
        """Servicio PARCIAL con updated_at > 4h vuelve a ABIERTA al recibir nueva petición."""
        db, q = _build_db_mock()

        # updated_at de 5 horas atrás (> 4h timeout)
        five_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        svc_parcial = _svc(
            agentes_requeridos=3,
            cupos_cubiertos=1,
            estado="PARCIAL",
            updated_at=five_hours_ago,
        )

        q.execute.side_effect = [
            MagicMock(data=[svc_parcial]),   # get service
            MagicMock(data=[{}]),            # reset to ABIERTA
            MagicMock(data=[{}]),            # cancel partial acceptances
            MagicMock(data=[{}]),            # log CUORUM_TIMEOUT
            MagicMock(data=[]),              # check existing agent
            MagicMock(data=[{}]),            # insert new agent
            MagicMock(data=[{}]),            # update PARCIAL again (fresh apply)
            MagicMock(data=[{}]),            # log AGENTE_APLICO
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-multi/agent-respond",
                headers=AGENT1_H,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 200
        # After timeout reset, the service is treated as ABIERTA → this agent is 1st apply → PARCIAL
        assert resp.json()["estado"] == "PARCIAL"
        assert resp.json()["cupos_cubiertos"] == 1

    def test_no_timeout_within_4h(self):
        """Servicio PARCIAL con updated_at < 4h NO se resetea."""
        from routers.services import _check_and_reset_cuorum_timeout

        db, q = _build_db_mock()
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        svc = _svc(estado="PARCIAL", updated_at=one_hour_ago)

        result = _check_and_reset_cuorum_timeout(db, svc)
        # Should remain PARCIAL — no update calls
        assert result["estado"] == "PARCIAL"
        db.table.assert_not_called()

    def test_timeout_logs_cuorum_timeout_event(self):
        """Cuando ocurre timeout, se registra evento CUORUM_TIMEOUT."""
        from routers.services import _check_and_reset_cuorum_timeout

        db, q = _build_db_mock()
        five_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        svc = _svc(estado="PARCIAL", cupos_cubiertos=2, updated_at=five_hours_ago)

        q.execute.return_value = MagicMock(data=[{}])

        result = _check_and_reset_cuorum_timeout(db, svc)
        assert result["estado"] == "ABIERTA"
        assert result["cupos_cubiertos"] == 0

        # Verify update and log were called
        assert db.table.called


# ── Tests: GET /services/open con cupos ──────────────────────

class TestOpenServicesWithCupos:
    def test_open_shows_cupos_info(self):
        """GET /services/open incluye cupos_total, cupos_cubiertos, cupos_disponibles."""
        db, q = _build_db_mock()
        svc = _svc(agentes_requeridos=3, cupos_cubiertos=1, estado="PARCIAL")
        q.execute.side_effect = [MagicMock(data=[svc])]

        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/open", headers=AGENT1_H)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["cupos_total"] == 3
        assert data[0]["cupos_cubiertos"] == 1
        assert data[0]["cupos_disponibles"] == 2

    def test_open_includes_parcial_services(self):
        """Servicios en estado PARCIAL también aparecen en /open."""
        db, q = _build_db_mock()
        svc_abierta = _svc(service_id="svc-a", estado="ABIERTA")
        svc_parcial = _svc(service_id="svc-p", estado="PARCIAL", cupos_cubiertos=1)
        q.execute.side_effect = [MagicMock(data=[svc_abierta, svc_parcial])]

        with patch("routers.services.get_supabase", return_value=db):
            resp = client.get("/services/open", headers=AGENT1_H)

        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_only_agent_can_see_open(self):
        resp = client.get("/services/open", headers=CLIENT_H)
        assert resp.status_code == 403


# ── Tests: precio multi-agente ────────────────────────────────

class TestMultiAgentPricing:
    def test_precio_formula(self):
        """precio_total = agentes_requeridos × duracion_horas × 50"""
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
                headers=CLIENT_H,
                json={
                    "descripcion": "Vigilancia",
                    "distrito": "Miraflores",
                    "tipo_servicio": "VIGILANCIA",
                    "agentes_requeridos": 3,
                    "duracion_horas": 3,
                    "fecha_inicio_solicitada": _FECHA_FUTURA,
                },
            )
        # 3 × 3 × 50 = 450
        assert captured.get("precio_total") == 450

    def test_precio_2_agents_4h(self):
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
                headers=CLIENT_H,
                json={
                    "descripcion": "Evento",
                    "distrito": "San Isidro",
                    "tipo_servicio": "EVENTO",
                    "agentes_requeridos": 2,
                    "duracion_horas": 4,
                    "fecha_inicio_solicitada": _FECHA_FUTURA,
                },
            )
        # 2 × 4 × 50 = 400
        assert captured.get("precio_total") == 400


# ── Tests: agente duplicado ───────────────────────────────────

class TestDuplicateAgentPrevention:
    def test_same_agent_cannot_apply_twice(self):
        """El mismo agente no puede aplicar dos veces al mismo servicio."""
        db, q = _build_db_mock()
        svc = _svc(agentes_requeridos=3, cupos_cubiertos=0, estado="ABIERTA")
        q.execute.side_effect = [
            MagicMock(data=[svc]),           # get service
            MagicMock(data=[{"id": "sa-1"}]),  # existing agent found!
        ]
        with patch("routers.services.get_supabase", return_value=db):
            resp = client.post(
                "/services/svc-multi/agent-respond",
                headers=AGENT1_H,
                json={"decision": "ACEPTAR"},
            )
        assert resp.status_code == 400
        assert "Ya aplicaste" in resp.json()["detail"]
