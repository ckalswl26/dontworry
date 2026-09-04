from fastapi import APIRouter

from app.models.schemas import DocumentReadinessRequest, DocumentReadinessResponse

router = APIRouter(prefix="/api", tags=["documents"])


@router.post("/documents/readiness", response_model=DocumentReadinessResponse)
def documents_readiness(req: DocumentReadinessRequest) -> DocumentReadinessResponse:
    held_set = set(req.documents_held)
    required = req.required_documents
    total = len(required)
    held = len([d for d in required if d in held_set])
    missing = [d for d in required if d not in held_set]
    readiness_pct = round((held / total) * 100, 1) if total else 100.0
    return DocumentReadinessResponse(
        task_id=req.task_id, total=total, held=held, missing=missing, readiness_pct=readiness_pct
    )
