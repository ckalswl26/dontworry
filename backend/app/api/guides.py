from fastapi import APIRouter, HTTPException

from app.models.schemas import GuideContent, MinWageInfo
from app.services import guide_service, wage_service

router = APIRouter(prefix="/api", tags=["guides"])


@router.get("/guides", response_model=list[GuideContent])
def list_guides() -> list[GuideContent]:
    return guide_service.list_guides()


@router.get("/guides/{guide_id}", response_model=GuideContent)
def get_guide(guide_id: str) -> GuideContent:
    guide = guide_service.get_guide(guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="guide not found")
    return guide


@router.get("/wage/min-wage", response_model=MinWageInfo)
def get_min_wage() -> MinWageInfo:
    return wage_service.get_min_wage_info()
