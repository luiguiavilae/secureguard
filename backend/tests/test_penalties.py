"""
Tests — services/penalties.py

Todos los accesos a Supabase y Stripe se mockean.
Los tests corren completamente en modo mock (db=None / service_data inyectado).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest

from services.penalties import apply_score_delta, cancel_service, apply_timeout_penalty


# ── helpers ───────────────────────────────────────────────────────────────────

def _svc(
    service_id: str = "svc-001",
    cliente_id: str = "cliente-001",
    agente_id: str = "agente-001",
    precio_total: float = 200.0,
    estado: str = "CONFIRMADO",
    minutos_hasta_inicio: float = 90.0,       # positivo = en el futuro
    stripe_pi: str | None = None,
) -> dict:
    """Construye un service_data de prueba con fecha calculada desde ahora."""
    fecha_inicio = (
        datetime.now(timezone.utc) + timedelta(minutes=minutos_hasta_inicio)
    ).isoformat()
    return {
        "id": service_id,
        "cliente_id": cliente_id,
        "agente_asignado_id": agente_id,
        "precio_total": precio_total,
        "estado": estado,
        "fecha_inicio_solicitada": fecha_inicio,
        "stripe_payment_intent_id": stripe_pi,
    }


# ── Tests: apply_score_delta (modo mock) ─────────────────────────────────────

class TestApplyScoreDelta:

    def test_score_baja_a_observado_cuando_cruza_50(self):
        # Score base 100, bajar 55 → 45 (OBSERVADO)
        result = apply_score_delta("user-001", -55, "TEST", db=None)
        assert result["nuevo_score"] == 45
        assert result["nuevo_nivel"] == "OBSERVADO"
        assert result["cambio_estado"] == "OBSERVADO"

    def test_score_negativo_activa_bloqueo(self):
        result = apply_score_delta("user-001", -120, "TEST", db=None)
        assert result["nuevo_score"] < 0
        assert result["nuevo_nivel"] == "BLOQUEADO"
        assert result["cambio_estado"] == "BLOQUEADO"

    def test_score_confiable_no_cambia_estado(self):
        # Score 100 → 95 (sigue CONFIABLE)
        result = apply_score_delta("user-001", -5, "TEST", db=None)
        assert result["nuevo_nivel"] == "CONFIABLE"
        assert result["cambio_estado"] is None

    def test_score_baja_a_restringido_cuando_cruza_20(self):
        result = apply_score_delta("user-001", -85, "TEST", db=None)
        assert result["nuevo_score"] == 15
        assert result["nuevo_nivel"] == "RESTRINGIDO"
        assert result["cambio_estado"] == "RESTRINGIDO"


# ── Tests: cancel_service — cancelación CLIENTE ──────────────────────────────

class TestCancelacionCliente:

    def test_cliente_mas_1h_recibe_75_pct_reembolso(self):
        """Cancelación >3h antes → 75% reembolso. Sin stripe_pi → no se llama refund."""
        svc = _svc(minutos_hasta_inicio=300, precio_total=200.0)   # 5h, sin stripe_pi

        result = cancel_service(
            service_id="svc-001",
            cancelled_by="cliente-001",
            motivo="cambio de planes",
            service_data=svc,
        )

        assert result["penalidad_aplicada"] == "CANCELACION_CLIENTE_MAS_1H"
        assert result["monto_reembolso"] == pytest.approx(150.0)   # 75% de 200
        assert result["monto_retenido"] == pytest.approx(50.0)

    def test_cliente_menos_1h_sin_reembolso(self):
        """Cancelación <1h antes → 0% reembolso."""
        svc = _svc(minutos_hasta_inicio=30, precio_total=200.0)

        result = cancel_service(
            service_id="svc-001",
            cancelled_by="cliente-001",
            motivo="emergencia",
            service_data=svc,
        )

        assert result["penalidad_aplicada"] == "CANCELACION_CLIENTE_MENOS_1H"
        assert result["monto_reembolso"] == 0.0
        assert result["monto_retenido"] == pytest.approx(200.0)

    def test_cliente_entre_1h_3h_recibe_50_pct(self):
        svc = _svc(minutos_hasta_inicio=90, precio_total=200.0)   # 1.5h

        result = cancel_service(
            service_id="svc-001",
            cancelled_by="cliente-001",
            motivo="test",
            service_data=svc,
        )

        assert result["penalidad_aplicada"] == "CANCELACION_CLIENTE_1H_3H"
        assert result["monto_reembolso"] == pytest.approx(100.0)   # 50%


# ── Tests: cancel_service — cancelación AGENTE ───────────────────────────────

class TestCancelacionAgente:

    def test_agente_mas_2h_pierde_15_pts_y_da_compensacion(self):
        """Cancelación agente >2h antes → -15 pts + S/20 compensación al cliente."""
        svc = _svc(minutos_hasta_inicio=180, precio_total=200.0)   # 3h, sin stripe_pi

        result = cancel_service(
            service_id="svc-001",
            cancelled_by="agente-001",
            motivo="problema personal",
            service_data=svc,
        )

        assert result["penalidad_aplicada"] == "CANCELACION_AGENTE_MAS_2H"
        assert result["nuevo_score"] == pytest.approx(85.0)   # 100 - 15
        assert result["compensacion_cliente"] == 20.0
        assert result["monto_reembolso"] == pytest.approx(200.0)   # reembolso completo

    def test_agente_menos_2h_pierde_25_pts_y_suspension_7_dias(self):
        """Cancelación agente <2h antes → -25 pts + suspensión 7 días."""
        svc = _svc(minutos_hasta_inicio=60, precio_total=200.0)   # 1h, sin stripe_pi

        result = cancel_service(
            service_id="svc-001",
            cancelled_by="agente-001",
            motivo="no puedo ir",
            service_data=svc,
        )

        assert result["penalidad_aplicada"] == "CANCELACION_AGENTE_MENOS_2H"
        assert result["nuevo_score"] == pytest.approx(75.0)   # 100 - 25
        assert result["suspension_dias"] == 7
        assert result["monto_reembolso"] == pytest.approx(200.0)

    def test_no_presentacion_pierde_50_pts_y_suspension_30_dias(self):
        """Timeout / no presentación → -50 pts + suspensión 30 días."""
        result = apply_timeout_penalty(
            service_id="svc-001",
            agente_id="agente-001",
            db=None,
        )

        assert result["penalidad_aplicada"] == "NO_PRESENTACION_TIMEOUT"
        assert result["nuevo_score"] == pytest.approx(50.0)   # 100 - 50
        assert result["suspension_dias"] == 30


# ── Tests: restricciones de nivel ────────────────────────────────────────────

class TestNivelesRestriccion:

    def test_score_bajo_a_observado_requiere_pago_anticipado(self):
        """Cuando score baja a OBSERVADO (20-49), cambio_estado = OBSERVADO."""
        result = apply_score_delta("user-001", -60, "TEST", db=None)
        assert result["nuevo_nivel"] == "OBSERVADO"
        assert result["cambio_estado"] == "OBSERVADO"

    def test_score_negativo_bloquea_cuenta(self):
        """Score negativo → nivel BLOQUEADO y cambio_estado = BLOQUEADO."""
        result = apply_score_delta("user-001", -110, "TEST", db=None)
        assert result["nuevo_nivel"] == "BLOQUEADO"
        assert result["cambio_estado"] == "BLOQUEADO"
        assert result["nuevo_score"] < 0
