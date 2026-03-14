"""
Tests — services/badges.py

Todos los tests corren en modo mock (db=None / agent_stats inyectado).
"""
from __future__ import annotations

import pytest

from services.badges import evaluate_badges, _calcular_comision


# ── Helpers ───────────────────────────────────────────────────────────────────

def _stats(
    completed: int = 0,
    rating_avg: float = 0.0,
    rating_count: int = 0,
    sin_retraso: int = 0,
    sin_cancelacion: int = 0,
    tipos: dict | None = None,
    badges_actuales: list | None = None,
) -> dict:
    return {
        "completed_services": completed,
        "rating_avg": rating_avg,
        "rating_count": rating_count,
        "servicios_sin_retraso": sin_retraso,
        "servicios_sin_cancelacion": sin_cancelacion,
        "tipos_servicio": tipos or {},
        "badges_actuales": badges_actuales or [],
    }


# ── Tests: badges de volumen ──────────────────────────────────────────────────

class TestBadgesVolumen:

    def test_despegue_se_otorga_en_primer_servicio(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=1))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "despegue" in ids

    def test_despegue_no_se_otorga_si_cero_servicios(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=0))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "despegue" not in ids

    def test_activo_se_otorga_al_llegar_a_10_servicios(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=10))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "activo" in ids
        assert "despegue" in ids   # también otorga los anteriores

    def test_centurion_se_otorga_con_100_servicios(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=100))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "centurion" in ids

    def test_no_se_otorga_badge_duplicado(self):
        # Ya tiene 'despegue', no debe otorgarse de nuevo
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=1, badges_actuales=["despegue"]),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "despegue" not in ids


# ── Tests: badges de rating ───────────────────────────────────────────────────

class TestBadgesRating:

    def test_bien_valorado_con_rating_45_y_10_servicios(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=10, rating_avg=4.6, rating_count=10),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "bien_valorado" in ids

    def test_bien_valorado_no_sin_suficientes_servicios(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=5, rating_avg=4.8, rating_count=5),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "bien_valorado" not in ids

    def test_diamante_reduce_comision(self):
        """Badge diamante (rating ≥4.9 en 100 servicios) reduce comisión en 5%."""
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=100, rating_avg=4.95, rating_count=100),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "diamante" in ids
        # diamante = -5% comisión, centurion = -4% → 20 - 5 - 4 = 11%
        assert result["nueva_comision"] == 11


# ── Tests: comisión ───────────────────────────────────────────────────────────

class TestComision:

    def test_sin_badges_comision_base_20(self):
        assert _calcular_comision([]) == 20

    def test_leyenda_comision_fija_8(self):
        assert _calcular_comision(["leyenda", "diamante", "reloj_suizo"]) == 8

    def test_descuentos_acumulados_reducen_comision(self):
        # siempre_a_tiempo (-2%) + reloj_suizo (-3%) + diamante (-5%) = -10% → 10%
        assert _calcular_comision(["siempre_a_tiempo", "reloj_suizo", "diamante"]) == 10

    def test_comision_minima_es_5(self):
        # Muchos descuentos no bajan de 5%
        muchos = ["siempre_a_tiempo", "reloj_suizo", "diamante", "centurion"]
        comision = _calcular_comision(muchos)
        assert comision >= 5

    def test_diamante_comision_correcta_sin_leyenda(self):
        # Solo diamante (-5%) → 20 - 5 = 15%
        assert _calcular_comision(["diamante"]) == 15


# ── Tests: puntualidad ────────────────────────────────────────────────────────

class TestBadgesPuntualidad:

    def test_puntual_con_5_servicios_sin_retraso(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=5, sin_retraso=5))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "puntual" in ids

    def test_siempre_a_tiempo_con_20_sin_retraso(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=20, sin_retraso=20))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "siempre_a_tiempo" in ids


# ── Tests: compromiso ─────────────────────────────────────────────────────────

class TestBadgesCompromiso:

    def test_cero_cancelaciones_con_20_sin_cancelar(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=20, sin_cancelacion=20))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "cero_cancelaciones" in ids

    def test_confiable_con_50_sin_cancelar(self):
        result = evaluate_badges("agent-001", agent_stats=_stats(completed=50, sin_cancelacion=50))
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "confiable" in ids


# ── Tests: especialización ────────────────────────────────────────────────────

class TestBadgesEspecializacion:

    def test_residencial_con_20_servicios_del_tipo(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=20, tipos={"RESIDENCIAL": 20}),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "residencial" in ids

    def test_no_badge_especializacion_sin_suficientes(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=15, tipos={"RESIDENCIAL": 15}),
        )
        ids = [b["id"] for b in result["badges_nuevos"]]
        assert "residencial" not in ids


# ── Tests: badges_totales refleja el estado completo ─────────────────────────

class TestBadgesTotales:

    def test_badges_totales_incluye_nuevos_y_previos(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=10, badges_actuales=["despegue"]),
        )
        assert "despegue" in result["badges_totales"]
        assert "activo" in result["badges_totales"]

    def test_no_duplicados_en_badges_totales(self):
        result = evaluate_badges(
            "agent-001",
            agent_stats=_stats(completed=1, badges_actuales=["despegue"]),
        )
        assert result["badges_totales"].count("despegue") == 1
