from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR


@lru_cache
def load_catalog() -> list[dict]:
    path = DATA_DIR / "action_catalog.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_crisis_signals(
    *,
    savings_goal_met: bool | None,
    shortfall_amount: int,
    document_readiness_pct: float,
    visit_required_tasks: int,
    days_to_deadline: int | None,
    unresolved_required_prerequisites: int,
    min_wage_violation_suspected: bool = False,
    not_applicable_tasks: list[str] | None = None,
) -> dict:
    return {
        "savings_goal_met": savings_goal_met,
        "shortfall_amount": shortfall_amount,
        "document_readiness_pct": document_readiness_pct,
        "visit_required_tasks": visit_required_tasks,
        "min_wage_violation_suspected": min_wage_violation_suspected,
        "days_to_deadline": days_to_deadline,
        "unresolved_required_prerequisites": unresolved_required_prerequisites,
        "not_applicable_tasks": not_applicable_tasks or [],
    }


def select_candidate_actions(crisis_signals: dict) -> list[dict]:
    """신호 -> Action Catalog 트리거 매핑. AI는 이 목록 밖의 행동을 만들 수 없다."""
    catalog = load_catalog()
    active_triggers: set[str] = set()

    if crisis_signals.get("savings_goal_met") is False:
        active_triggers.add("savings_goal_met_false")
    if (crisis_signals.get("document_readiness_pct") or 100) < 100:
        active_triggers.add("document_readiness_low")
    if (crisis_signals.get("visit_required_tasks") or 0) > 0:
        active_triggers.add("visit_required_task_exists")
    if crisis_signals.get("min_wage_violation_suspected"):
        active_triggers.add("min_wage_violation_suspected")
    if (crisis_signals.get("unresolved_required_prerequisites") or 0) > 0:
        active_triggers.add("unresolved_required_prerequisite")
    if crisis_signals.get("not_applicable_tasks"):
        active_triggers.add("not_applicable_task_exists")
    days = crisis_signals.get("days_to_deadline")
    if days is not None and days <= 14:
        active_triggers.add("days_to_deadline_low")

    return [c for c in catalog if c["trigger_signal"] in active_triggers]
