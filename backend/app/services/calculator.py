"""순수 계산 로직 (F6 자산목표 플래너, F7 D-Day). LLM을 사용하지 않는다."""
from __future__ import annotations

from datetime import date

from app.models.schemas import DDayItem, DDayResponse, PlannerRequest, PlannerResponse
from app.rules import engine as rule_engine

BRANCH_VISIT_CHANNELS = {"BRANCH_VISIT", "BRANCH_VISIT_OR_MAIL"}


def calculate_planner(req: PlannerRequest) -> PlannerResponse:
    total_expense = req.expenses.total
    disposable_income = req.monthly_income - total_expense
    months_left = max(req.months_left, 1)
    required_monthly_saving = (req.target_amount - req.current_savings) / months_left
    goal_met = disposable_income >= required_monthly_saving
    shortfall = max(0, round(required_monthly_saving - disposable_income))

    categories: list[str] = []
    if req.monthly_income > 0:
        categories.append("FOREIGN_WORKER_SAVINGS")
    if req.expenses.remittance > 0:
        categories.append("FOREIGN_WORKER_REMITTANCE_CHANNEL")

    return PlannerResponse(
        disposable_income=disposable_income,
        required_monthly_saving=round(required_monthly_saving),
        goal_met=goal_met,
        shortfall_amount=shortfall,
        recommended_categories=categories,
    )


# 팀이 정한 "권장" 시점 (법정기한이 아님) - UI에서 반드시 '권장'으로 표시
RECOMMENDED_DDAY_OFFSETS = [
    {"day_offset": -30, "task_id": "departure_notification", "label": "출국예정신고 (EPS)", "detail": "오늘부터 신고 가능합니다.", "is_recommended_not_legal": False},
    {"day_offset": -30, "task_id": "maturity_insurance", "label": "출국만기보험 신청", "detail": "출국예정사실확인서 발급 후 진행하세요 (팀 권장 시점).", "is_recommended_not_legal": True},
    {"day_offset": -7, "task_id": "overseas_remittance", "label": "해외송금·계좌 정리", "detail": "1만 달러 초과 송금 시 세관신고 대상 여부를 확인하세요 (팀 권장 시점).", "is_recommended_not_legal": True},
    {"day_offset": 0, "task_id": None, "label": "출국", "detail": "모든 정리가 끝났습니다.", "is_recommended_not_legal": False},
]

# 방문이 필요한 업무는 서류를 챙기고 영업일·예약 여부를 확인할 시간이 필요해서
# 실제 처리 시점보다 여유 있게(팀 권장 D-14) 미리 알려준다. 법정기한이 아니라
# 팀이 정한 권장 시점이므로 is_recommended_not_legal=True로 표시한다.
EARLY_VISIT_NOTICE_OFFSET = -14


def _early_visit_notice_items() -> list[dict]:
    """departure_rule_graph.json에서 channel이 방문형인 업무 중,
    RECOMMENDED_DDAY_OFFSETS에 아직 task_id로 등장하지 않는 업무만
    D-14 '미리 준비하세요' 항목으로 추가한다. 하드코딩된 새 사실을 만들지 않고,
    이미 Rule Graph에 있는 channel 값만 그대로 읽어서 쓴다."""
    already_covered = {item["task_id"] for item in RECOMMENDED_DDAY_OFFSETS if item["task_id"]}

    extra_items: list[dict] = []
    for node in rule_engine.get_all_nodes():
        if node["id"] in already_covered:
            continue
        if node.get("channel") not in BRANCH_VISIT_CHANNELS:
            continue
        extra_items.append(
            {
                "day_offset": EARLY_VISIT_NOTICE_OFFSET,
                "task_id": node["id"],
                "label": f"{node['label_ko']} 미리 준비하세요",
                "detail": "방문이 필요한 업무예요. 서류를 미리 챙기고 영업일을 확인해두면 좋아요 (팀 권장 시점).",
                "is_recommended_not_legal": True,
            }
        )
    return extra_items


def calculate_dday(departure_date: date) -> DDayResponse:
    days_left = (departure_date - date.today()).days
    channel_by_task = {node["id"]: node.get("channel") for node in rule_engine.get_all_nodes()}

    all_offsets = RECOMMENDED_DDAY_OFFSETS + _early_visit_notice_items()
    all_offsets = sorted(all_offsets, key=lambda item: item["day_offset"])

    items = [
        DDayItem(
            **item,
            requires_visit=channel_by_task.get(item["task_id"]) in BRANCH_VISIT_CHANNELS,
        )
        for item in all_offsets
    ]
    return DDayResponse(departure_date=departure_date, days_left=days_left, items=items)
