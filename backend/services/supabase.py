from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from supabase import Client, create_client

from config import settings

logger = logging.getLogger(__name__)


# ── Mock en memoria ───────────────────────────────────────────

class _MockResult:
    """Imita el objeto de respuesta de supabase-py."""
    def __init__(self, data: list[dict], count: int | None = None):
        self.data = data
        self.count = count


class _MockQueryBuilder:
    """
    Query builder que acumula filtros y los ejecuta contra
    listas Python en memoria. Soporta el API de supabase-py:
      .select / .insert / .update + .eq / .gte / .lte /
      .order / .limit / .contains + .execute()
    """

    def __init__(self, table_data: list[dict]):
        self._data = table_data
        self._op = "select"
        self._insert_payload: dict | None = None
        self._update_payload: dict | None = None
        self._filters: list[tuple] = []
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._limit_n: int | None = None
        self._count_exact: bool = False

    # ── Operaciones ───────────────────────────────────────
    def select(self, _cols: str = "*", count: str | None = None) -> _MockQueryBuilder:
        self._op = "select"
        self._count_exact = count == "exact"
        return self

    def insert(self, payload: dict) -> _MockQueryBuilder:
        self._op = "insert"
        self._insert_payload = payload
        return self

    def update(self, payload: dict) -> _MockQueryBuilder:
        self._op = "update"
        self._update_payload = payload
        return self

    # ── Filtros ───────────────────────────────────────────
    def eq(self, col: str, val: Any) -> _MockQueryBuilder:
        self._filters.append(("eq", col, val))
        return self

    def gte(self, col: str, val: Any) -> _MockQueryBuilder:
        self._filters.append(("gte", col, val))
        return self

    def lte(self, col: str, val: Any) -> _MockQueryBuilder:
        self._filters.append(("lte", col, val))
        return self

    def contains(self, col: str, val: Any) -> _MockQueryBuilder:
        self._filters.append(("contains", col, val))
        return self

    def order(self, col: str, desc: bool = False) -> _MockQueryBuilder:
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int) -> _MockQueryBuilder:
        self._limit_n = n
        return self

    # ── Evaluación de filtros ─────────────────────────────
    def _match(self, row: dict) -> bool:
        for ftype, col, val in self._filters:
            row_val = row.get(col)
            if ftype == "eq":
                if row_val != val:
                    return False
            elif ftype == "gte":
                # comparación lexicográfica válida para ISO timestamps y HH:MM
                if row_val is None or str(row_val) < str(val):
                    return False
            elif ftype == "lte":
                if row_val is None or str(row_val) > str(val):
                    return False
            elif ftype == "contains":
                if not isinstance(row_val, list):
                    return False
                if not all(v in row_val for v in val):
                    return False
        return True

    # ── Ejecución ─────────────────────────────────────────
    def execute(self) -> _MockResult:
        data = self._data  # referencia directa — mutaciones son persistentes

        if self._op == "insert":
            row = {
                **self._insert_payload,
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            data.append(row)
            return _MockResult(data=[row])

        if self._op == "update":
            updated: list[dict] = []
            for row in data:
                if self._match(row):
                    row.update(self._update_payload)  # type: ignore[arg-type]
                    updated.append(row)
            return _MockResult(data=updated)

        # select — filtrar primero (para count correcto), luego ordenar y limitar
        filtered = [r for r in data if self._match(r)]
        total_count = len(filtered) if self._count_exact else None

        if self._order_col:
            filtered.sort(
                key=lambda r: str(r.get(self._order_col) or ""),
                reverse=self._order_desc,
            )

        result_rows = filtered[: self._limit_n] if self._limit_n is not None else filtered
        return _MockResult(data=result_rows, count=total_count)


class MockSupabaseClient:
    """
    Cliente Supabase simulado en memoria.
    Se usa automáticamente cuando SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
    son placeholders o están vacíos.
    Los datos se pierden al reiniciar el servidor — solo para desarrollo local.
    """

    def __init__(self) -> None:
        self._store: dict[str, list[dict]] = {}
        logger.warning(
            "⚠️  MockSupabaseClient activo — datos en memoria (solo desarrollo). "
            "Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY reales para persistencia."
        )

    def table(self, name: str) -> _MockQueryBuilder:
        if name not in self._store:
            self._store[name] = []
        return _MockQueryBuilder(self._store[name])

    @property
    def storage(self) -> Any:
        raise NotImplementedError(
            "Storage no disponible en modo mock. "
            "Configura las credenciales reales de Supabase."
        )


# ── Singleton ─────────────────────────────────────────────────

_client: Client | MockSupabaseClient | None = None


def get_supabase() -> Client | MockSupabaseClient:
    """
    Retorna el cliente Supabase.
    - Con credenciales reales: cliente supabase-py oficial.
    - Sin credenciales / con placeholders: MockSupabaseClient en memoria.
    """
    global _client
    if _client is None:
        if settings.is_mock_supabase:
            _client = MockSupabaseClient()
        else:
            try:
                _client = create_client(
                    settings.supabase_url,
                    settings.supabase_service_role_key,
                )
                logger.info("Cliente Supabase inicializado correctamente")
            except Exception as exc:
                logger.error(f"Error inicializando cliente Supabase: {exc}")
                raise RuntimeError(f"No se pudo conectar con Supabase: {exc}") from exc
    return _client


def reset_client() -> None:
    """Resetea el singleton. Útil en tests."""
    global _client
    _client = None
