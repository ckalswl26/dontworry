from fastapi import APIRouter

from app.services import product_service

router = APIRouter(prefix="/api/finance", tags=["finance"])


@router.get("/deposits")
def get_deposits():
    result = product_service.get_fss_deposits()
    return {
        "products": [p.model_dump() for p in result["products"]],
        "error": result["error"],
        "data_as_of_note": "금융감독원 금융상품 통합비교공시 최신 공시 기준",
    }


@router.get("/savings")
def get_savings():
    result = product_service.get_fss_savings()
    return {
        "products": [p.model_dump() for p in result["products"]],
        "error": result["error"],
        "data_as_of_note": "금융감독원 금융상품 통합비교공시 최신 공시 기준",
    }


@router.get("/whitelist")
def get_whitelist():
    products = product_service.get_whitelisted_products()
    return {"products": [p.model_dump() for p in products]}
