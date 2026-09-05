from fastapi import APIRouter

from app.models.schemas import FxRatesResponse
from app.services import fx_service

router = APIRouter(prefix="/api/fx", tags=["fx"])


@router.get("/rates", response_model=FxRatesResponse)
def get_fx_rates() -> FxRatesResponse:
    return fx_service.get_fx_rates()
