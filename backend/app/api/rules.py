from datetime import date

from fastapi import APIRouter

from app.models.schemas import (
    DeparturePlanRequest,
    DeparturePlanResponse,
    PensionRequest,
    PensionResult,
    RuleEvaluateRequest,
    RuleEvaluateResponse,
    SignalStatus,
)
from app.rules import engine as rule_engine
from app.rules import immigration_engine, pension_engine

router = APIRouter(prefix="/api", tags=["rules"])


def _days_to_departure(departure_date: date | None) -> int | None:
    if departure_date is None:
        return None
    return (departure_date - date.today()).days


@router.post("/rules/evaluate", response_model=RuleEvaluateResponse)
def evaluate_rules(req: RuleEvaluateRequest) -> RuleEvaluateResponse:
    profile = req.profile
    days_left = _days_to_departure(profile.departure_date)

    ctx = rule_engine.RuleContext(
        nationality=profile.nationality,
        visa_type=profile.visa_type,
        days_to_departure=days_left,
        tenure_months=profile.tenure_months,
        documents_held=set(req.documents_held),
    )
    tasks = rule_engine.evaluate_tasks(ctx)

    pension_result = pension_engine.evaluate(
        PensionRequest(
            nationality=profile.nationality,
            visa_type=profile.visa_type,
            nps_enrolled=bool(profile.nps_enrolled),
            nps_insured_months=profile.nps_insured_months,
            departure_date=profile.departure_date,
            departure_confirmed=False,
        )
    )

    for task in tasks:
        if task.task_id == "pension_refund":
            if not pension_result.eligible:
                task.signal = SignalStatus.NA
            elif pension_result.payable_now:
                task.signal = SignalStatus.GREEN
            else:
                task.signal = SignalStatus.AMBER
            task.reason = pension_result.reason
            task.required_documents = pension_result.missing_documents

    return RuleEvaluateResponse(days_to_departure=days_left, tasks=tasks, pension=pension_result)


@router.post("/pension/evaluate", response_model=PensionResult)
def evaluate_pension(req: PensionRequest) -> PensionResult:
    return pension_engine.evaluate(req)


@router.post("/departure/plan", response_model=DeparturePlanResponse)
def departure_plan(req: DeparturePlanRequest) -> DeparturePlanResponse:
    steps = rule_engine.build_workflow()
    categories = ["FOREIGN_WORKER_SAVINGS", "FOREIGN_WORKER_REMITTANCE_CHANNEL"]
    return DeparturePlanResponse(ordered_steps=steps, product_categories=categories)


@router.get("/immigration/rules/{rule_id}")
def get_immigration_rule(rule_id: str):
    rule = immigration_engine.get_rule(rule_id)
    if rule is None:
        return {"error": "RULE_NOT_FOUND"}
    return rule


@router.get("/immigration/rules")
def list_immigration_rules():
    return {"rule_ids": immigration_engine.list_rule_ids()}
