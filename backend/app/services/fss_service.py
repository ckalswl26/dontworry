"""금융감독원 FINE(금융상품 통합비교공시) Open API 연동.

- API 키는 반드시 환경변수(FSS_API_KEY)로만 사용한다.
- 응답은 fin_co_no + fin_prdt_cd 기준으로 baseList/optionList를 병합해 정규화한다.
- 장애/타임아웃 시 앱 전체가 죽지 않도록 빈 리스트 + 에러 플래그로 우아하게 실패한다.
- 응답은 짧게 인메모리 캐시한다 (외부 API 호출 최소화).
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import get_settings

BASE_URL = "https://finlife.fss.or.kr/finlifeapi"
BANK_GROUP_NO = "020000"
CACHE_TTL_SECONDS = 60 * 30

_cache: dict[str, tuple[float, Any]] = {}


class FssServiceError(Exception):
    pass


def _cache_get(key: str) -> Any | None:
    entry = _cache.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > CACHE_TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.time(), value)


def _fetch_all_pages(endpoint: str) -> list[dict]:
    settings = get_settings()
    if not settings.fss_api_key:
        raise FssServiceError("FSS_API_KEY not configured")

    cache_key = f"raw:{endpoint}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    all_base: list[dict] = []
    all_option: list[dict] = []
    page_no = 1
    with httpx.Client(timeout=10.0) as client:
        while True:
            params = {
                "auth": settings.fss_api_key,
                "topFinGrpNo": BANK_GROUP_NO,
                "pageNo": page_no,
            }
            resp = client.get(f"{BASE_URL}/{endpoint}", params=params)
            resp.raise_for_status()
            data = resp.json()
            result = data.get("result", {})
            err_cd = result.get("err_cd")
            if err_cd and err_cd != "000":
                raise FssServiceError(f"FSS API error {err_cd}: {result.get('err_msg')}")

            all_base.extend(result.get("baseList", []) or [])
            all_option.extend(result.get("optionList", []) or [])

            total_count = int(result.get("total_count", 0) or 0)
            max_page_no = int(result.get("max_page_no", page_no) or page_no)
            if page_no >= max_page_no or not result.get("baseList"):
                break
            page_no += 1
            if page_no > 20:  # safety cap
                break

    merged = _merge(all_base, all_option)
    _cache_set(cache_key, merged)
    return merged


def _merge(base_list: list[dict], option_list: list[dict]) -> list[dict]:
    options_by_key: dict[tuple[str, str], list[dict]] = {}
    for opt in option_list:
        key = (opt.get("fin_co_no"), opt.get("fin_prdt_cd"))
        options_by_key.setdefault(key, []).append(opt)

    merged: list[dict] = []
    for base in base_list:
        key = (base.get("fin_co_no"), base.get("fin_prdt_cd"))
        opts = options_by_key.get(key, [])
        rates = [o.get("intr_rate") for o in opts if o.get("intr_rate") is not None]
        max_rates = [o.get("intr_rate2") for o in opts if o.get("intr_rate2") is not None]
        merged.append(
            {
                "product_id": f"{base.get('fin_co_no')}:{base.get('fin_prdt_cd')}",
                "product_name": base.get("fin_prdt_nm"),
                "bank": base.get("kor_co_nm"),
                "join_way": base.get("join_way"),
                "join_member": base.get("join_member"),
                "join_deny": base.get("join_deny"),
                "spcl_cnd": base.get("spcl_cnd"),
                "base_rate": min(rates) if rates else None,
                "max_rate": max(max_rates) if max_rates else None,
                "contract_months_options": sorted({o.get("save_trm") for o in opts if o.get("save_trm")}),
                "rate_as_of": base.get("dcls_month"),
                "status": "ACTIVE",
            }
        )
    return merged


def get_deposit_products() -> dict:
    try:
        products = _fetch_all_pages("depositProductsSearch.json")
        return {"products": products, "error": None}
    except (httpx.HTTPError, FssServiceError):
        return {"products": [], "error": "FSS_UNAVAILABLE"}


def get_savings_products() -> dict:
    try:
        products = _fetch_all_pages("savingProductsSearch.json")
        return {"products": products, "error": None}
    except (httpx.HTTPError, FssServiceError):
        return {"products": [], "error": "FSS_UNAVAILABLE"}
