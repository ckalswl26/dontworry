from __future__ import annotations

import json
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import AmountRange, FinanceProduct, ProductEligibility, TermMonthsRange
from app.services import fss_service, source_service


@lru_cache
def _load_whitelist() -> list[dict]:
    path = DATA_DIR / "finance" / "product_whitelist.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _row_to_product(row: dict) -> FinanceProduct:
    return FinanceProduct(
        product_id=row["product_id"],
        product_name=row["product_name"],
        bank=row["bank"],
        product_type=row["product_type"],
        product_category=row.get("product_category"),
        base_rate=row.get("base_rate"),
        max_rate=row.get("max_rate"),
        rate_as_of=row.get("rate_as_of"),
        contract_months=row.get("contract_months"),
        monthly_min_amount=row.get("monthly_min_amount"),
        monthly_max_amount=row.get("monthly_max_amount"),
        status=row.get("status", "ACTIVE"),
        sources=source_service.get_sources([row["source_id"]]) if row.get("source_id") else [],
        eligibility=ProductEligibility(**row["eligibility"]) if row.get("eligibility") else None,
        amount_range=AmountRange(**row["amount_range"]) if row.get("amount_range") else None,
        term_months_range=TermMonthsRange(**row["term_months_range"]) if row.get("term_months_range") else None,
        purpose_tags=row.get("purpose_tags", []),
        notes_ko=row.get("notes_ko", ""),
        caution_ko=row.get("caution_ko"),
        source_url=row.get("source_url"),
        is_whitelisted=True,
        remote_opening_available=row.get("channels", {}).get("mobile", {}).get("available"),
    )


def get_whitelisted_products(product_type: str | None = None) -> list[FinanceProduct]:
    """서민금융/외국인 전용 상품 whitelist. ENDED 상태는 절대 추천하지 않는다."""
    rows = _load_whitelist()
    products = []
    for row in rows:
        if row.get("status") == "ENDED" or row.get("do_not_recommend"):
            continue
        if product_type and row.get("product_type") != product_type:
            continue
        products.append(_row_to_product(row))
    return products


def get_all_matchable_products() -> list[FinanceProduct]:
    """F5 추천/점수 엔진에 넣을 후보 전체. 화이트리스트 우선, 이후 3순위(FSS 결합)에서 확장."""
    return get_whitelisted_products()


def get_fss_deposits() -> dict:
    result = fss_service.get_deposit_products()
    return _normalize_fss_result(result, "DEPOSIT")


def get_fss_savings() -> dict:
    result = fss_service.get_savings_products()
    return _normalize_fss_result(result, "SAVINGS")


def _normalize_fss_result(result: dict, product_type: str) -> dict:
    if result.get("error"):
        return {"products": [], "error": result["error"]}
    products = [
        FinanceProduct(
            product_id=p["product_id"],
            product_name=p["product_name"] or "",
            bank=p["bank"] or "",
            product_type=product_type,
            base_rate=p.get("base_rate"),
            max_rate=p.get("max_rate"),
            rate_as_of=p.get("rate_as_of"),
            status="ACTIVE",
        )
        for p in result["products"]
        if p.get("status", "ACTIVE") == "ACTIVE"
    ]
    return {"products": products, "error": None}
