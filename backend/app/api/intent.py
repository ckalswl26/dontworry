from fastapi import APIRouter

from app.models.schemas import IntentRequest, IntentResult
from app.services import ai_service
from app.services.calculator import calculate_dday

router = APIRouter(prefix="/api", tags=["intent"])


@router.post("/intent", response_model=IntentResult)
def post_intent(req: IntentRequest) -> IntentResult:
    result = ai_service.extract_intent(req.text, req.profile)
    if req.profile.departure_date is not None:
        dday = calculate_dday(req.profile.departure_date)
        result.residency_days_left = dday.days_left
    result.available_time_slots = req.profile.available_visit_time
    return result
