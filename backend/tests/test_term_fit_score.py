from datetime import date, timedelta

from app.models.schemas import FinanceProduct, UserFinanceProfile
from app.services.product_matcher import (
    TERM_FIT_BUFFER_DAYS,
    compute_term_fit_score,
    compute_usable_window_message,
    compute_usable_window_months,
)


def _product(**overrides) -> FinanceProduct:
    base = {
        "product_id": "TEST",
        "product_name": "테스트 적금",
        "bank": "테스트은행",
        "product_type": "SAVINGS",
        "contract_months": 6,
        "is_whitelisted": True,
        "remote_opening_available": True,
        "monthly_min_amount": 10000,
        "monthly_max_amount": 500000,
    }
    base.update(overrides)
    return FinanceProduct(**base)


def _profile(**overrides) -> UserFinanceProfile:
    base = {
        "nationality": "VN",
        "visa_type": "E-9",
        "departure_date": date.today() + timedelta(days=180 + TERM_FIT_BUFFER_DAYS + 30),
        "monthly_savings_target": 100000,
    }
    base.update(overrides)
    return UserFinanceProfile(**base)


def test_full_score_when_every_criterion_is_met():
    score, reasons = compute_term_fit_score(_product(), _profile())
    assert score == 100
    assert len(reasons) == 5


def test_zero_score_when_everything_is_unknown():
    product = _product(is_whitelisted=False, remote_opening_available=None, monthly_min_amount=None, monthly_max_amount=None)
    profile = _profile(departure_date=None, monthly_savings_target=None)
    score, reasons = compute_term_fit_score(product, profile)
    # 목표 저축액 자체가 없으면 "납입한도 제한 없음" 우대(+10)도 비교할 대상이 없어
    # 확인 불가로 0점 처리한다 - 아무것도 확인 안 됐는데 낙관적으로 점수를 주지 않는다.
    assert score == 0
    assert any("확인할 수 없어요" in r for r in reasons)


def test_savings_target_within_unlimited_product_scores_full_points():
    product = _product(monthly_min_amount=None, monthly_max_amount=None)
    profile = _profile()
    score, reasons = compute_term_fit_score(product, profile)
    assert "납입 한도 제한이 없어요 (+10)" in reasons
    assert score == 100


def test_deducts_maturity_points_when_after_departure():
    product = _product(contract_months=24)  # 만기 약 720일 후
    profile = _profile(departure_date=date.today() + timedelta(days=30))
    score, reasons = compute_term_fit_score(product, profile)
    assert "만기가 출국 예정일 이후예요 (0)" in reasons
    # 만기 40+20점은 못 받지만 whitelisted(20)+savings(10)+remote(10)는 받는다
    assert score == 40


def test_savings_target_outside_limit_scores_zero_for_that_criterion():
    product = _product(monthly_min_amount=1_000_000, monthly_max_amount=2_000_000)
    profile = _profile(monthly_savings_target=100_000)
    score, reasons = compute_term_fit_score(product, profile)
    assert "목표 저축액이 납입 한도를 벗어나요 (0)" in reasons
    assert score == 90


def test_usable_window_months_subtracts_buffer():
    departure = date.today() + timedelta(days=200)
    months = compute_usable_window_months(departure)
    assert months == (200 - TERM_FIT_BUFFER_DAYS) // 30


def test_usable_window_months_floors_at_zero_when_departure_imminent():
    departure = date.today() + timedelta(days=5)
    assert compute_usable_window_months(departure) == 0


def test_usable_window_message_mentions_month_count():
    departure = date.today() + timedelta(days=200)
    months = compute_usable_window_months(departure)
    message = compute_usable_window_message(departure)
    assert message is not None
    assert str(months) in message


def test_usable_window_none_without_departure_date():
    assert compute_usable_window_months(None) is None
    assert compute_usable_window_message(None) is None
