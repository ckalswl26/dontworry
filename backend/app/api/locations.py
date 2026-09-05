from fastapi import APIRouter

from app.models.schemas import BranchSearchResponse
from app.services import branch_service, location_service

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/multilingual-branches")
def get_multilingual_branches(bank: str | None = None):
    branches = location_service.get_multilingual_branches(bank)
    return {"branches": [b.model_dump() for b in branches]}


@router.get("/bank-list")
def get_bank_list():
    return {"banks": branch_service.MAJOR_BANKS}


@router.get("/nearby-banks", response_model=BranchSearchResponse)
def get_nearby_banks(lat: float, lng: float, radius_m: int = 2000) -> BranchSearchResponse:
    return branch_service.search_nearby(lat, lng, radius_m)


@router.get("/branch-search", response_model=BranchSearchResponse)
def get_branch_search(bank: str, query: str = "") -> BranchSearchResponse:
    return branch_service.search_by_keyword(bank, query)
