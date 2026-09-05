from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import GuideContent
from app.services.source_service import get_sources


@lru_cache
def _load_guides() -> list[dict]:
    path = DATA_DIR / "guides.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_guide(guide_id: str) -> GuideContent | None:
    row = next((g for g in _load_guides() if g["guide_id"] == guide_id), None)
    if not row:
        return None
    return GuideContent(
        guide_id=row["guide_id"],
        title=row["title"],
        summary=row["summary"],
        steps=row["steps"],
        note=row["note"],
        sources=get_sources(row.get("source_ids", [])),
    )


def list_guides() -> list[GuideContent]:
    return [get_guide(row["guide_id"]) for row in _load_guides()]
