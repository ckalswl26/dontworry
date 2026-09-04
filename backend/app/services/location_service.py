from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import MultilingualBranch


@lru_cache
def _load_branches() -> list[dict]:
    path = DATA_DIR / "locations" / "multilingual_bank_branches.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_multilingual_branches(bank: str | None = None) -> list[MultilingualBranch]:
    """검증된 다국어 상담 지점만 반환한다. 확인 안 된 지점은 seed에 아예 넣지 않는다."""
    rows = _load_branches()
    branches = [MultilingualBranch(**row) for row in rows]
    if bank:
        branches = [b for b in branches if b.bank == bank]
    return branches
