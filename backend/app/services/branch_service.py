"""은행 지점 검색 / GPS 근처 지점 찾기 (카카오 로컬 API).

역할 경계:
- 지점 이름/주소/좌표는 카카오 로컬 API가 실시간으로 반환한 값만 사용한다. 코드가
  임의로 지점을 만들어내지 않는다.
- KAKAO_REST_API_KEY가 없거나 호출이 실패해도 앱이 죽지 않고, available=False +
  error 메시지로 프론트에 알린다 (fx_service.py의 ECOS_API_KEY fallback과 동일 패턴).
- "일요 영업점" 표시는 카카오가 알 수 없는 정보라, Priority 3에서 이미 검증해둔
  다국어 지점 데이터(multilingual_bank_branches.json)와 이름을 대조해서만 붙인다.
  대조에 실패하면 그냥 표시하지 않는다 - 추측으로 배지를 붙이지 않는다.
"""
from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.models.schemas import BranchLocation, BranchSearchResponse
from app.services.location_service import get_multilingual_branches

logger = logging.getLogger(__name__)

KAKAO_CATEGORY_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/category.json"
KAKAO_KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
BANK_CATEGORY_CODE = "BK9"

# 상담신청카드 은행 선택 목록. 지점 정보가 아니라 은행 이름만 나열한 것이라
# 실 지점 데이터를 지어내는 것과 무관하다 (검색 필터 용도).
MAJOR_BANKS: list[str] = [
    "KB국민은행", "신한은행", "우리은행", "하나은행", "NH농협은행",
    "IBK기업은행", "새마을금고", "우체국", "카카오뱅크", "토스뱅크",
]


def _find_sunday_note(bank: str | None, place_name: str) -> tuple[bool, str | None, str | None]:
    if not bank:
        return False, None, None
    for branch in get_multilingual_branches(bank=bank):
        if branch.source_id != "SHINHAN_SUNDAY_FOREIGN_BRANCHES":
            continue
        core_name = branch.branch_name.split("(")[0].strip()
        if core_name and core_name in place_name:
            return True, branch.note, branch.source_id
    return False, None, None


def _parse_document(doc: dict) -> BranchLocation:
    place_name = doc.get("place_name", "")
    bank = next((b for b in MAJOR_BANKS if b.replace("KB", "").strip() in place_name or b in place_name), None)
    is_sunday, note, source_id = _find_sunday_note(bank, place_name)
    distance = doc.get("distance")
    return BranchLocation(
        place_name=place_name,
        bank=bank,
        address=doc.get("address_name"),
        road_address=doc.get("road_address_name"),
        phone=doc.get("phone") or None,
        lat=float(doc["y"]),
        lng=float(doc["x"]),
        distance_m=int(distance) if distance not in (None, "") else None,
        place_url=doc.get("place_url"),
        sunday_branch=is_sunday,
        sunday_branch_note=note,
        sunday_branch_source_id=source_id,
    )


def _call_kakao(url: str, params: dict, api_key: str) -> list[dict]:
    with httpx.Client() as client:
        resp = client.get(
            url,
            params=params,
            headers={"Authorization": f"KakaoAK {api_key}"},
            timeout=5.0,
        )
        resp.raise_for_status()
        return resp.json().get("documents", [])


def search_nearby(lat: float, lng: float, radius_m: int = 2000) -> BranchSearchResponse:
    settings = get_settings()
    if not settings.kakao_rest_api_key:
        return BranchSearchResponse(available=False, error="지점 검색 API 인증키가 설정되지 않았습니다.")

    try:
        docs = _call_kakao(
            KAKAO_CATEGORY_SEARCH_URL,
            {"category_group_code": BANK_CATEGORY_CODE, "x": lng, "y": lat, "radius": radius_m, "sort": "distance"},
            settings.kakao_rest_api_key,
        )
    except Exception:
        logger.exception("Kakao nearby branch search failed")
        return BranchSearchResponse(available=False, error="근처 은행 지점 정보를 불러올 수 없습니다.")

    return BranchSearchResponse(branches=[_parse_document(d) for d in docs], available=True)


def search_by_keyword(bank: str, query: str = "") -> BranchSearchResponse:
    settings = get_settings()
    if not settings.kakao_rest_api_key:
        return BranchSearchResponse(available=False, error="지점 검색 API 인증키가 설정되지 않았습니다.")

    keyword = f"{bank} {query}".strip()
    try:
        docs = _call_kakao(
            KAKAO_KEYWORD_SEARCH_URL,
            {"query": keyword, "category_group_code": BANK_CATEGORY_CODE, "size": 15},
            settings.kakao_rest_api_key,
        )
    except Exception:
        logger.exception("Kakao branch keyword search failed")
        return BranchSearchResponse(available=False, error="지점 검색 결과를 불러올 수 없습니다.")

    return BranchSearchResponse(branches=[_parse_document(d) for d in docs], available=True)
