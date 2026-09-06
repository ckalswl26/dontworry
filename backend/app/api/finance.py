from fastapi import APIRouter

from app.models.schemas import ProductRecommendationResponse, RemoteAccountOpening, UserFinanceProfile
from app.services import ai_service, product_matcher, product_service, remote_account_service

router = APIRouter(prefix="/api/finance", tags=["finance"])
products_router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/deposits")
def get_deposits():
    result = product_service.get_fss_deposits()
    return {
        "products": [p.model_dump() for p in result["products"]],
        "error": result["error"],
        "is_sample_data": result.get("is_sample_data", False),
        "data_as_of_note": "금융감독원 금융상품 통합비교공시 최신 공시 기준",
    }


@router.get("/savings")
def get_savings():
    result = product_service.get_fss_savings()
    return {
        "products": [p.model_dump() for p in result["products"]],
        "error": result["error"],
        "is_sample_data": result.get("is_sample_data", False),
        "data_as_of_note": "금융감독원 금융상품 통합비교공시 최신 공시 기준",
    }


@router.get("/whitelist")
def get_whitelist():
    products = product_service.get_whitelisted_products()
    return {"products": [p.model_dump() for p in products]}


@router.get("/remote-account-opening", response_model=list[RemoteAccountOpening])
def get_remote_account_opening() -> list[RemoteAccountOpening]:
    return remote_account_service.get_remote_account_opening()


@products_router.post("/recommend", response_model=ProductRecommendationResponse)
def recommend_products(profile: UserFinanceProfile) -> ProductRecommendationResponse:
    """RULE(product_matcher) → GEN(ai_service) → GUARD 파이프라인.

    LLM은 product_matcher가 이미 자격 조건으로 걸러낸 candidates 안에서만
    설명 문구를 만들 수 있고, 그 목록 밖의 상품을 추천하는 것은 구조적으로 불가능하다.
    """
    all_products = product_service.get_all_matchable_products()
    candidates = product_matcher.get_candidate_products(profile, all_products)
    recommendations, ai_generated = ai_service.generate_product_recommendations(candidates, profile)
    return ProductRecommendationResponse(
        recommendations=recommendations,
        ai_generated=ai_generated,
        usable_window_months=product_matcher.compute_usable_window_months(profile.departure_date),
        usable_window_message_ko=product_matcher.compute_usable_window_message(profile.departure_date),
    )
