from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import RemoteAccountOpening


@lru_cache
def _load() -> list[dict]:
    path = DATA_DIR / "remote_account_opening.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_remote_account_opening() -> list[RemoteAccountOpening]:
    return [RemoteAccountOpening(**row) for row in _load()]
