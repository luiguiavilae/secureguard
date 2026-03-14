"""
jobs/check_cancellations.py — Cron job diario a medianoche (00:00 Lima).

Tareas:
  1. Día 1 de cada mes: resetea cancelaciones_mes en profiles.
  2. Desbloquea cuentas cuyo bloqueo temporal ya venció.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def run(db=None) -> dict:
    """
    Ejecuta el mantenimiento diario de cancelaciones.
    Retorna: { resets_realizados: int, cuentas_desbloqueadas: int }
    """
    if db is None:
        logger.info("[JOB] check_cancellations corriendo en modo mock — sin db")
        return {"resets_realizados": 0, "cuentas_desbloqueadas": 0}

    now = datetime.now(timezone.utc)
    resets = 0
    desbloqueadas = 0

    # 1. Reset mensual (día 1)
    if now.day == 1:
        try:
            db.table("agent_profiles").update({"cancelaciones_mes": 0}).neq(
                "cancelaciones_mes", 0
            ).execute()
            db.table("client_profiles").update({"cancelaciones_mes": 0}).neq(
                "cancelaciones_mes", 0
            ).execute()
            resets += 1
            logger.info("[JOB] check_cancellations: cancelaciones_mes reseteadas (día 1)")
        except Exception as exc:
            logger.error(f"[JOB] Error reseteando cancelaciones_mes: {exc}")

    # 2. Desbloquear agentes con suspensión vencida
    try:
        result = (
            db.table("agent_profiles")
            .select("id, user_id")
            .eq("status", "suspended")
            .lte("suspension_hasta", now.isoformat())
            .execute()
        )
        for agente in (result.data or []):
            db.table("agent_profiles").update(
                {"status": "verified", "suspension_hasta": None}
            ).eq("id", agente["id"]).execute()
            logger.info(f"[JOB] check_cancellations: agente {agente['id']} desbloqueado")
            desbloqueadas += 1
    except Exception as exc:
        logger.error(f"[JOB] Error desbloqueando cuentas: {exc}")

    logger.info(
        f"[JOB] check_cancellations completado: "
        f"resets={resets}, desbloqueadas={desbloqueadas}"
    )
    return {"resets_realizados": resets, "cuentas_desbloqueadas": desbloqueadas}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from services.supabase import get_supabase
    db = get_supabase()
    stats = run(db=db)
    print(f"Resultado: {stats}")
