from fastapi import APIRouter

from app.models.schemas import ConsultCardTranslateRequest, ConsultCardTranslateResponse
from app.services import ai_service

router = APIRouter(prefix="/api/consult-card", tags=["consult-card"])


@router.post("/translate", response_model=ConsultCardTranslateResponse)
def translate(req: ConsultCardTranslateRequest) -> ConsultCardTranslateResponse:
    result = ai_service.translate_consult_card(
        visit_purpose_ko=req.visit_purpose_ko,
        required_documents_ko=req.required_documents_ko,
        judgement_basis_ko=req.judgement_basis_ko,
        target_lang=req.target_lang,
    )
    return ConsultCardTranslateResponse(**result)
