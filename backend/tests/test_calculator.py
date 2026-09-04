from app.models.schemas import ExpenseBreakdown, PlannerRequest
from app.services.calculator import calculate_planner


def test_demo_persona_savings_goal():
    req = PlannerRequest(
        target_amount=20_000_000,
        current_savings=0,
        months_left=40,
        monthly_income=2_200_000,
        expenses=ExpenseBreakdown(communication=150_000, remittance=800_000),
    )
    result = calculate_planner(req)
    assert result.disposable_income == 1_250_000
    assert result.required_monthly_saving == 500_000
    assert result.goal_met is True
    assert result.shortfall_amount == 0


def test_shortfall_when_disposable_income_below_required():
    req = PlannerRequest(
        target_amount=20_000_000,
        current_savings=0,
        months_left=40,
        monthly_income=2_200_000,
        expenses=ExpenseBreakdown(communication=150_000, remittance=2_000_000),
    )
    result = calculate_planner(req)
    assert result.disposable_income == 50_000
    assert result.goal_met is False
    assert result.shortfall_amount == 450_000
