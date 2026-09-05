"""실시간 환율 조회 (한국은행 ECOS Open API, 통계표 731Y001).

역할 경계:
- 환율 숫자는 ECOS 응답값만 사용한다. LLM/코드가 임의로 추정하지 않는다.
- ECOS_API_KEY가 없거나 호출이 실패해도 앱이 죽지 않고, available=False + error
  메시지로 프론트에 명확히 알린다 (ai_service.py의 ANTHROPIC_API_KEY fallback과 동일한 패턴).
- EPS 17개국 중 ECOS 731Y001에 실제 고시되지 않는 통화는 UNSUPPORTED_CURRENCIES로
  명시하고, 그 통화에는 어떤 숫자도 채우지 않는다.
"""
from __future__ import annotations

import logging
import time
from datetime import date, timedelta

import httpx

from app.config import get_settings
from app.models.schemas import FxRate, FxRatesResponse
from app.services.source_service import get_sources

logger = logging.getLogger(__name__)

ECOS_STAT_CODE = "731Y001"
ECOS_BASE_URL = "https://ecos.bok.or.kr/api/StatisticSearch"

# 통화코드 -> ECOS 731Y001 ITEM_CODE. (직접 ECOS API를 호출해 확인함, 2026-09-05)
CURRENCY_ITEM_CODES: dict[str, str] = {
    "VND": "0000035",  # 원/베트남동(100동)
    "PHP": "0000034",  # 원/필리핀페소
    "THB": "0000028",  # 원/태국바트
    "IDR": "0000029",  # 원/인도네시아루피아(100루피아)
    "BDT": "0000039",  # 원/방글라데시타카
    "PKR": "0000038",  # 원/파키스탄루피
    "CNY": "0000053",  # 원/위안(매매기준율)
    "MNT": "0000032",  # 원/몽골투그릭
}

# ECOS는 100단위로 고시하는 통화가 있어, 1단위 환율로 맞추려면 나눠야 한다.
CURRENCY_UNIT_SCALE: dict[str, int] = {
    "VND": 100,
    "IDR": 100,
}

# EPS 17개국 통화 중 ECOS 731Y001(53개 항목 전체 확인)에 고시되지 않는 통화.
# 절대 임의 환율을 채우지 않고, 프론트에서 "아직 제공하지 않습니다" 안내로 대체한다.
UNSUPPORTED_CURRENCIES: list[str] = ["KHR", "LAK", "MMK", "NPR", "LKR", "KGS", "TJS", "UZS"]

FX_CACHE_TTL_SECONDS = 20 * 60

_cache: dict[str, tuple[float, FxRate]] = {}


def _fetch_rate(client: httpx.Client, api_key: str, currency: str, item_code: str) -> FxRate | None:
    end = date.today()
    start = end - timedelta(days=10)
    url = (
        f"{ECOS_BASE_URL}/{api_key}/json/kr/1/10/{ECOS_STAT_CODE}/D/"
        f"{start:%Y%m%d}/{end:%Y%m%d}/{item_code}"
    )
    resp = client.get(url, timeout=5.0)
    resp.raise_for_status()
    payload = resp.json()

    result = payload.get("StatisticSearch")
    if not result or not result.get("row"):
        logger.warning("ECOS returned no rows for %s: %s", currency, payload.get("RESULT"))
        return None

    latest = result["row"][-1]
    value = float(latest["DATA_VALUE"])
    scale = CURRENCY_UNIT_SCALE.get(currency, 1)
    time_str = str(latest["TIME"])
    as_of = f"{time_str[0:4]}-{time_str[4:6]}-{time_str[6:8]}"
    return FxRate(currency=currency, rate=value / scale, as_of=as_of)


def get_fx_rates() -> FxRatesResponse:
    settings = get_settings()
    sources = get_sources(["BOK_ECOS_FX_RATES"])

    if not settings.ecos_api_key:
        return FxRatesResponse(
            rates=[],
            unsupported=UNSUPPORTED_CURRENCIES,
            sources=sources,
            available=False,
            error="환율 API 인증키가 설정되지 않아 실시간 환율을 불러올 수 없습니다.",
        )

    now = time.monotonic()
    rates: list[FxRate] = []
    with httpx.Client() as client:
        for currency, item_code in CURRENCY_ITEM_CODES.items():
            cached = _cache.get(currency)
            if cached and now - cached[0] < FX_CACHE_TTL_SECONDS:
                rates.append(cached[1])
                continue
            try:
                rate = _fetch_rate(client, settings.ecos_api_key, currency, item_code)
            except Exception:
                logger.exception("ECOS fetch failed for %s", currency)
                rate = None

            if rate is not None:
                _cache[currency] = (now, rate)
                rates.append(rate)
            elif cached:
                # 이번 호출은 실패했지만 이전에 받아둔 값이 있으면 그걸 계속 보여준다.
                rates.append(cached[1])

    if not rates:
        return FxRatesResponse(
            rates=[],
            unsupported=UNSUPPORTED_CURRENCIES,
            sources=sources,
            available=False,
            error="환율 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
        )

    return FxRatesResponse(
        rates=rates,
        unsupported=UNSUPPORTED_CURRENCIES,
        sources=sources,
        available=True,
        error=None,
    )
