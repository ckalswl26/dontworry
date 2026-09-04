from datetime import date

from fastapi import APIRouter

from app.config import get_settings
from app.models.schemas import BriefingRequest, BriefingResponse, PensionRequest, SignalStatus
from app.rules import engine as rule_engine
from app.rules import pension_engine
from app.services import ai_service, source_service
from app.services.action_catalog_service import build_crisis_signals, select_candidate_actions
from app.services.calculator import calculate_planner

router = APIRouter(prefix="/api", tags=["briefing"])


def _days_to_departure(departure_date: date | None) -> int | None:
    if departure_date is None:
        return None
    return (departure_date - date.today()).days


@router.post("/briefing", response_model=BriefingResponse)
def post_briefing(req: BriefingRequest) -> BriefingResponse:
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
        )
    )

    not_applicable = [t.label for t in tasks if t.signal == SignalStatus.NA]
    visit_required = len([t for t in tasks if t.signal == SignalStatus.RED])
    unresolved_prereq = len(
        [t for t in tasks if t.task_id in ("departure_notification", "departure_confirmation") and t.signal != SignalStatus.GREEN]
    )

    held = set(req.documents_held)
    doc_tasks = [t for t in tasks if t.required_documents]
    if doc_tasks:
        total_docs = sum(len(t.required_documents) for t in doc_tasks)
        held_docs = sum(len([d for d in t.required_documents if d in held]) for t in doc_tasks)
        readiness_pct = round((held_docs / total_docs) * 100, 1) if total_docs else 100.0
    else:
        readiness_pct = 100.0

    planner_result = None
    savings_goal_met = None
    shortfall = 0
    if req.planner is not None:
        planner_result = calculate_planner(req.planner)
        savings_goal_met = planner_result.goal_met
        shortfall = planner_result.shortfall_amount

    settings = get_settings()
    min_wage_violation = False
    if req.hourly_wage is not None:
        min_wage_violation = req.hourly_wage < settings.min_wage_2026

    crisis_signals = build_crisis_signals(
        savings_goal_met=savings_goal_met,
        shortfall_amount=shortfall,
        document_readiness_pct=readiness_pct,
        visit_required_tasks=visit_required,
        days_to_deadline=days_left,
        unresolved_required_prerequisites=unresolved_prereq,
        min_wage_violation_suspected=min_wage_violation,
        not_applicable_tasks=not_applicable,
    )

    candidates = select_candidate_actions(crisis_signals)
    ranked_actions, ai_generated = ai_service.rank_actions(crisis_signals, candidates)

    top3_summary = [f"{a.title}. {a.why}" for a in ranked_actions] or [
        "지금 특별히 긴급한 조치는 없어요. 처리 순서대로 진행하시면 됩니다."
    ]

    sources = source_service.get_sources(
        ["HRDK_RETURN_COST_INSURANCE", "NPS_LUMP_SUM_REFUND", "MOEL_MIN_WAGE_2026"]
    )

    return BriefingResponse(
        crisis_signals=crisis_signals,
        ranked_actions=ranked_actions,
        top3_summary=top3_summary,
        sources=sources,
        ai_generated=ai_generated,
    )
