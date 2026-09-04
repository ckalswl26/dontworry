from datetime import date

from fastapi import APIRouter

from app.models.schemas import DDayResponse, PlannerRequest, PlannerResponse, ScenarioRequest, ScenarioResponse
from app.services.calculator import calculate_dday, calculate_planner

router = APIRouter(prefix="/api", tags=["planner"])


@router.post("/planner/calculate", response_model=PlannerResponse)
def planner_calculate(req: PlannerRequest) -> PlannerResponse:
    return calculate_planner(req)


@router.post("/scenario", response_model=ScenarioResponse)
def scenario(req: ScenarioRequest) -> ScenarioResponse:
    base_result = calculate_planner(req.base_planner)

    updated = req.base_planner.model_copy(deep=True)
    if req.changed_field in ("monthly_income", "months_left"):
        setattr(updated, req.changed_field, req.new_value)
    else:
        setattr(updated.expenses, req.changed_field, req.new_value)

    updated_result = calculate_planner(updated)
    delta = updated_result.required_monthly_saving - base_result.required_monthly_saving
    return ScenarioResponse(base=base_result, updated=updated_result, delta_required_monthly_saving=delta)


@router.get("/dday/{departure_date}", response_model=DDayResponse)
def dday(departure_date: date) -> DDayResponse:
    return calculate_dday(departure_date)
