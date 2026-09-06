"""F5 금융상품 추천 - RULE 단계.

결정론적 자격 필터링만 수행한다. LLM 호출이 전혀 없다 — 이 모듈이 만든
candidates 리스트 밖의 상품은 이후 GEN/GUARD 단계에서도 절대 나올 수 없다
(F10의 Action Catalog와 동일한 방어 패턴).

프로필 값이 없어서 자격 충족 여부를 확인할 수 없는 경우, 낙관적으로 통과시키지
않고 후보에서 제외한다("확인 안 됨"을 "가능함"으로 과대해석하지 않는다).
"""
from __future__ import annotations

from datetime import date, timedelta

from app.models.schemas import FinanceProduct, UserFinanceProfile

# calculator.py의 RECOMMENDED_DDAY_OFFSETS에서 만기보험(maturity_insurance) 관련
# 권장 시점에 이미 -30일(1개월) 여유를 두고 있다 - term_fit도 같은 기준을 쓴다.
TERM_FIT_BUFFER_DAYS = 30
DAYS_PER_MONTH_APPROX = 30  # 이 프로젝트 전반에서 쓰는 근사치(플래너 등)와 동일하게 맞춘다.


def _passes_eligibility(product: FinanceProduct, profile: UserFinanceProfile) -> bool:
    elig = product.eligibility
    if elig is None:
        return True

    if elig.visa_types and profile.visa_type not in elig.visa_types:
        return False

    if elig.requires_arc and profile.has_arc is not True:
        return False

    if elig.is_tax_resident_required and profile.is_tax_resident is not True:
        return False

    if elig.min_tenure_months > 0:
        if profile.tenure_months is None or profile.tenure_months < elig.min_tenure_months:
            return False

    if elig.min_visa_remaining_months is not None:
        if profile.visa_remaining_months is None or profile.visa_remaining_months <= elig.min_visa_remaining_months:
            return False

    return True


def _passes_purpose(product: FinanceProduct, profile: UserFinanceProfile) -> bool:
    if not profile.purpose:
        return True
    if not product.purpose_tags:
        return True
    return profile.purpose in product.purpose_tags


def get_candidate_products(profile: UserFinanceProfile, products: list[FinanceProduct]) -> list[FinanceProduct]:
    """자격 조건과 목적 태그를 만족하는 상품만 남긴다."""
    return [p for p in products if _passes_eligibility(p, profile) and _passes_purpose(p, profile)]


def build_eligibility_badge(product: FinanceProduct, profile: UserFinanceProfile) -> str:
    """'재직 7개월↑ 충족' 같은 짧은 배지 문구. RULE 값만 조합하며 LLM을 쓰지 않는다."""
    elig = product.eligibility
    if elig is None:
        return "조건 확인됨"

    parts: list[str] = []
    if elig.visa_types:
        parts.append(f"체류자격({profile.visa_type}) 해당")
    if elig.requires_arc:
        parts.append("외국인등록증 보유 확인됨")
    if elig.min_tenure_months > 0:
        parts.append(f"재직 {elig.min_tenure_months}개월↑ 충족")
    if elig.is_tax_resident_required:
        parts.append("세법상 거주자 요건 충족")
    if elig.min_visa_remaining_months is not None:
        parts.append(f"체류만료 {elig.min_visa_remaining_months}개월 초과 남음")

    return " · ".join(parts) if parts else "조건 확인됨"


def _minimum_term_months(product: FinanceProduct) -> int | None:
    """예금/적금은 contract_months(단일값), 대출/ISA 등은 term_months_range.min을 쓴다
    (실제 시드 데이터 형태가 상품 종류별로 다르다 - 둘 다 확인한다)."""
    if product.contract_months is not None:
        return product.contract_months
    if product.term_months_range is not None and product.term_months_range.min is not None:
        return product.term_months_range.min
    return None


def compute_term_fit(product: FinanceProduct, departure_date: date | None) -> str | None:
    """상품의 최소 만기가 출국예정일 대비 적합한지 판정한다.

    - 만기/출국예정일 중 하나라도 확인 안 되면 판정하지 않는다(None) - 낙관적으로
      GREEN을 주지 않는다.
    - GREEN: 만기가 출국예정일보다 1개월(TERM_FIT_BUFFER_DAYS) 이상 여유 있게 이전
    - AMBER: 만기가 출국예정일 전후 1개월 이내로 근접
    - RED: 만기가 출국예정일보다 1개월 넘게 이후 (중도해지 위험)
    """
    term_months = _minimum_term_months(product)
    if term_months is None or departure_date is None:
        return None

    maturity_date = date.today() + timedelta(days=term_months * DAYS_PER_MONTH_APPROX)
    slack_days = (departure_date - maturity_date).days

    if slack_days >= TERM_FIT_BUFFER_DAYS:
        return "GREEN"
    if slack_days >= -TERM_FIT_BUFFER_DAYS:
        return "AMBER"
    return "RED"
