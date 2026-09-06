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


@lru_cache
def _whitelisted_bank_names() -> frozenset[str]:
    """product_whitelist.json에 등재된 구체적 은행명 집합. '전 은행/증권사' 같은
    포괄 표현은 특정 은행을 가리키지 않으므로 매칭 대상에서 제외한다."""
    generic_labels = {"전 은행/증권사", "주택도시기금 수탁은행 전체", "서민금융진흥원 협약 금융회사"}
    return frozenset(
        row["bank"] for row in _load_whitelist() if row.get("bank") and row["bank"] not in generic_labels
    )


def _min_contract_months(options: list[str]) -> int | None:
    months = [int(o) for o in options if str(o).isdigit()]
    return min(months) if months else None


def get_all_matchable_products() -> list[FinanceProduct]:
    """F5 추천/점수 엔진에 넣을 후보 전체. 화이트리스트 상품 + FSS 공시 예적금(은행명 기준
    화이트리스트 매칭으로 is_whitelisted 판정)을 합쳐서 돌려준다."""
    whitelisted = get_whitelisted_products()
    fss_savings = get_fss_savings()["products"]
    fss_deposits = get_fss_deposits()["products"]
    return whitelisted + fss_savings + fss_deposits


def get_fss_deposits() -> dict:
    result = fss_service.get_deposit_products()
    return _normalize_fss_result(result, "DEPOSIT")


def get_fss_savings() -> dict:
    result = fss_service.get_savings_products()
    return _normalize_fss_result(result, "SAVINGS")


def _normalize_fss_result(result: dict, product_type: str) -> dict:
    if result.get("error"):
        return {"products": [], "error": result["error"]}
    bank_whitelist = _whitelisted_bank_names()
    is_sample = result.get("is_sample_data", False)
    products = [
        FinanceProduct(
            product_id=p["product_id"],
            product_name=p["product_name"] or "",
            bank=p["bank"] or "",
            product_type=product_type,
            base_rate=p.get("base_rate"),
            max_rate=p.get("max_rate"),
            rate_as_of=p.get("rate_as_of"),
            contract_months=_min_contract_months(p.get("contract_months_options", [])),
            status="ACTIVE",
            is_whitelisted=p.get("bank") in bank_whitelist,
            notes_ko="" if p.get("bank") in bank_whitelist else "외국인 가입 가능 여부 확인 필요",
            is_sample_data=is_sample,
        )
        for p in result["products"]
        if p.get("status", "ACTIVE") == "ACTIVE"
    ]
    return {"products": products, "error": None, "is_sample_data": is_sample}
