"""
jobs/check_agent_timeout.py — Cron job cada 5 minutos.

Detecta servicios CONFIRMADO donde el agente no hizo check-in (ts_inicio_real IS NULL)
y han pasado más de 20 minutos desde el inicio pactado.
Aplica penalidad máxima (-50 pts + 30 días) y reabre el servicio.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

TIMEOUT_MINUTOS = 20


def run(db=None) -> dict:
    """
    Ejecuta el check de timeouts.

    En modo mock (db=None) no hace nada y retorna stats vacías.
    Con db real procesa todos los servicios pendientes.

    Retorna: { procesados: int, errores: int }
    """
    from services.penalties import apply_timeout_penalty

    procesados = 0
    errores = 0

    if db is None:
        logger.info("⏰ [JOB] check_agent_timeout corriendo en modo mock — sin db")
        return {"procesados": 0, "errores": 0}

    limite = (datetime.now(timezone.utc) - timedelta(minutes=TIMEOUT_MINUTOS)).isoformat()

    result = (
        db.table("services")
        .select("id, agente_asignado_id, fecha_inicio_solicitada")
        .eq("estado", "CONFIRMADO")
        .is_("ts_inicio_real", "null")
        .lte("fecha_inicio_solicitada", limite)
        .execute()
    )

    servicios = result.data or []

    if not servicios:
        logger.info("⏰ [JOB] check_agent_timeout: ningún timeout detectado")
        return {"procesados": 0, "errores": 0}

    for svc in servicios:
        service_id: str = svc["id"]
        agente_id: str = svc.get("agente_asignado_id") or ""

        if not agente_id:
            logger.warning(f"⏰ [JOB] Servicio {service_id} sin agente asignado, saltando")
            continue

        try:
            apply_timeout_penalty(service_id=service_id, agente_id=agente_id, db=db)
            logger.warning(
                f"⏰ [JOB] Timeout detectado para servicio {service_id} "
                f"— agente {agente_id} penalizado (-50 pts + 30 días)"
            )
            procesados += 1
        except Exception as exc:
            logger.error(f"⏰ [JOB] Error procesando timeout svc={service_id}: {exc}")
            errores += 1

    logger.info(f"⏰ [JOB] check_agent_timeout completado: {procesados} procesados, {errores} errores")
    return {"procesados": procesados, "errores": errores}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from services.supabase import get_supabase
    db = get_supabase()
    stats = run(db=db)
    print(f"Resultado: {stats}")
