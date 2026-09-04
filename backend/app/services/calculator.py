"""순수 계산 로직 (F6 자산목표 플래너, F7 D-Day). LLM을 사용하지 않는다."""
from __future__ import annotations

from datetime import date

from app.models.schemas import DDayItem, DDayResponse, PlannerRequest, PlannerResponse


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


def calculate_dday(departure_date: date) -> DDayResponse:
    days_left = (departure_date - date.today()).days
    items = [DDayItem(**item) for item in RECOMMENDED_DDAY_OFFSETS]
    return DDayResponse(departure_date=departure_date, days_left=days_left, items=items)
