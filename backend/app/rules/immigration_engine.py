"""E-9 체류/사증 Rule Engine (2026-09-01 법무부 매뉴얼 기준).

결과는 단순 boolean이 아니라 CONFIRMED / CONDITIONAL / ADDITIONAL_REVIEW /
EXTERNAL_RULESET_REQUIRED / NOT_SUPPORTED 중 하나로 반환한다.
"""
from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.services import source_service

MANUAL_SNAPSHOT = "2026-09-01"


@lru_cache
def _load() -> dict:
    path = DATA_DIR / "rules" / "e9_immigration_rules.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def list_rule_ids() -> list[str]:
    return list(_load()["rules"].keys())


def get_rule(rule_id: str) -> dict | None:
    rules = _load()["rules"]
    rule = rules.get(rule_id)
    if rule is None:
        return None
    enriched = dict(rule)
    enriched["manual_snapshot"] = MANUAL_SNAPSHOT
    enriched["sources"] = [
        s.model_dump() for s in source_service.get_sources(_load()["source_ids"])
    ]
    return enriched


def get_status_transition(from_status: str, to_status: str) -> dict | None:
    for t in _load()["status_transitions"]:
        if t["from"] == from_status and t["to"] == to_status:
            enriched = dict(t)
            enriched["manual_snapshot"] = MANUAL_SNAPSHOT
            return enriched
    return None


def evaluate_workplace_change(
    changes_used: int,
    is_reemployment_period: bool = False,
    worker_at_fault: bool = True,
) -> dict:
    """E9_WORKPLACE_CHANGE 판정: 초기 취업기간 3회 / 재고용 연장기간 2회 제한."""
    rule = get_rule("E9_WORKPLACE_CHANGE")
    limits = rule["change_limits"]
    max_changes = (
        limits["reemployment_extended_period_max_changes"]
        if is_reemployment_period
        else limits["initial_employment_period_max_changes"]
    )

    effective_changes = changes_used
    if not worker_at_fault and not limits["worker_not_at_fault_change_counted"]:
        effective_changes = max(0, changes_used - 1)

    if effective_changes < max_changes:
        status = "CONFIRMED"
        reason = f"근무처 변경 {effective_changes}/{max_changes}회 사용. 추가 변경 신청이 가능합니다."
    else:
        status = "CONDITIONAL"
        reason = f"근무처 변경 한도({max_changes}회)에 도달했습니다. 예외 사유(산업재해·질병·임신·출산 등)가 없다면 추가 변경이 제한될 수 있습니다."

    return {
        "rule_id": "E9_WORKPLACE_CHANGE",
        "status": status,
        "reason": reason,
        "actor": "WORKER",
        "deadline_days": None,
        "deadline_months": {
            "employment_center_application": rule["deadlines"]["apply_employment_center_within_months_after_contract_end"],
            "immigration_permission": rule["deadlines"]["obtain_immigration_permission_within_months_after_change_application"],
        },
        "required_documents": rule["required_documents"],
        "manual_snapshot": MANUAL_SNAPSHOT,
        "source_id": "IMMIGRATION_STAY_MANUAL",
    }


def evaluate_stay_extension(months_employed_in_system: int) -> dict:
    rule = get_rule("E9_STAY_EXTENSION")
    ceiling = rule["employment_system_max_months"]
    remaining = max(0, ceiling - months_employed_in_system)
    if remaining <= 0:
        status = "CONDITIONAL"
        reason = "고용허가제 최대 체류기간(58개월)에 도달했습니다. 재고용 특례 요건 충족 여부를 별도 확인해야 합니다."
    else:
        status = "CONFIRMED"
        reason = f"고용허가제 체류상한까지 약 {remaining}개월 남았습니다."
    return {
        "rule_id": "E9_STAY_EXTENSION",
        "status": status,
        "reason": reason,
        "actor": "WORKER",
        "required_documents": rule["base_documents"],
        "manual_snapshot": MANUAL_SNAPSHOT,
        "source_id": "IMMIGRATION_STAY_MANUAL",
    }
