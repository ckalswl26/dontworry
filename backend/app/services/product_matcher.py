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


def compute_usable_window_months(departure_date: date | None) -> int | None:
    """출국까지 남은 기간에서 여유기간(TERM_FIT_BUFFER_DAYS)을 뺀, 안전하게 가입할 수
    있는 최대 만기 개월수. 출국예정일이 없으면 계산하지 않는다(None)."""
    if departure_date is None:
        return None
    usable_days = (departure_date - date.today()).days - TERM_FIT_BUFFER_DAYS
    return max(0, usable_days // DAYS_PER_MONTH_APPROX)


def compute_usable_window_message(departure_date: date | None) -> str | None:
    months = compute_usable_window_months(departure_date)
    if months is None:
        return None
    if months <= 0:
        return "출국 예정일이 얼마 남지 않아, 지금은 안전하게 가입할 수 있는 만기의 상품이 없어요. 이미 가입한 상품이 있다면 만기와 출국일을 비교해보세요."
    return f"출국까지 {months}개월보다 긴 상품은 중도해지 가능성이 있어 추천하지 않을게요."


# 100점 만점 배점 (전부 결정론적 계산 - LLM이 점수를 매기거나 조정하지 않는다)
_SCORE_MATURITY_BEFORE_DEPARTURE = 40
_SCORE_COMFORTABLE_BUFFER = 20
_SCORE_WHITELISTED = 20
_SCORE_WITHIN_SAVINGS_TARGET = 10
_SCORE_REMOTE_OPENING = 10


def compute_term_fit_score(product: FinanceProduct, profile: UserFinanceProfile) -> tuple[int, list[str]]:
    """체류기간 적합도 100점 배점. (점수, 산정 근거 문구 리스트)를 반환한다.

    배점: 만기가 출국 전(40) + 여유기간 이상 남기고 만기(20) + 화이트리스트 등재(20)
    + 목표 저축액이 납입한도 안(10) + 비대면 가입 가능(10). 확인 안 된 항목은
    낙관적으로 점수를 주지 않고 0점 + 이유를 남긴다.
    """
    score = 0
    reasons: list[str] = []

    fit = compute_term_fit(product, profile.departure_date)
    if fit in ("GREEN", "AMBER"):
        score += _SCORE_MATURITY_BEFORE_DEPARTURE
        reasons.append(f"만기가 출국 예정일 이전이에요 (+{_SCORE_MATURITY_BEFORE_DEPARTURE})")
    elif fit == "RED":
        reasons.append("만기가 출국 예정일 이후예요 (0)")
    else:
        reasons.append("만기 또는 출국예정일 정보가 없어 확인할 수 없어요 (0)")

    if fit == "GREEN":
        score += _SCORE_COMFORTABLE_BUFFER
        reasons.append(f"만기 후에도 출국까지 {TERM_FIT_BUFFER_DAYS}일 이상 여유가 있어요 (+{_SCORE_COMFORTABLE_BUFFER})")
    else:
        reasons.append("만기 후 여유기간이 부족하거나 확인할 수 없어요 (0)")

    if product.is_whitelisted:
        score += _SCORE_WHITELISTED
        reasons.append(f"외국인 가입이 확인된 상품이에요 (+{_SCORE_WHITELISTED})")
    else:
        reasons.append("외국인 가입 가능 여부가 아직 확인되지 않았어요 (0)")

    if profile.monthly_savings_target is not None:
        min_amt = product.monthly_min_amount
        max_amt = product.monthly_max_amount
        if min_amt is None and max_amt is None:
            score += _SCORE_WITHIN_SAVINGS_TARGET
            reasons.append(f"납입 한도 제한이 없어요 (+{_SCORE_WITHIN_SAVINGS_TARGET})")
        elif (min_amt is None or profile.monthly_savings_target >= min_amt) and (
            max_amt is None or profile.monthly_savings_target <= max_amt
        ):
            score += _SCORE_WITHIN_SAVINGS_TARGET
            reasons.append(f"목표 저축액이 납입 한도 안에 들어와요 (+{_SCORE_WITHIN_SAVINGS_TARGET})")
        else:
            reasons.append("목표 저축액이 납입 한도를 벗어나요 (0)")
    else:
        reasons.append("목표 저축액 정보가 없어 확인할 수 없어요 (0)")

    if product.remote_opening_available is True:
        score += _SCORE_REMOTE_OPENING
        reasons.append(f"비대면(모바일) 가입이 가능해요 (+{_SCORE_REMOTE_OPENING})")
    else:
        reasons.append("비대면 가입 가능 여부가 확인되지 않았어요 (0)")

    return score, reasons
