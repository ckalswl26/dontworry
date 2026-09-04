from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import SourceRef


@lru_cache
def _load_registry() -> dict[str, dict]:
    path = DATA_DIR / "source_registry.json"
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    return {row["source_id"]: row for row in rows}


def get_source(source_id: str) -> SourceRef | None:
    row = _load_registry().get(source_id)
    if not row:
        return None
    return SourceRef(
        source_id=row["source_id"],
        organization=row.get("organization"),
        title=row.get("title"),
        source_url=row.get("source_url"),
        authority_grade=row.get("authority_grade"),
        status=row.get("status"),
        last_verified_at=row.get("last_verified_at"),
    )


def get_sources(source_ids: list[str]) -> list[SourceRef]:
    return [s for sid in source_ids if (s := get_source(sid)) is not None]


def get_raw_source(source_id: str) -> dict | None:
    return _load_registry().get(source_id)


def all_sources() -> list[dict]:
    return list(_load_registry().values())
