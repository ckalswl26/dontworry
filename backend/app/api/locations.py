from fastapi import APIRouter

from app.services import location_service

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/multilingual-branches")
def get_multilingual_branches(bank: str | None = None):
    branches = location_service.get_multilingual_branches(bank)
    return {"branches": [b.model_dump() for b in branches]}
