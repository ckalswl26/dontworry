from datetime import date, timedelta

from app.models.schemas import FinanceProduct
from app.services.product_matcher import TERM_FIT_BUFFER_DAYS, compute_term_fit


def _product(**overrides) -> FinanceProduct:
    base = {
        "product_id": "TEST",
        "product_name": "테스트 적금",
        "bank": "테스트은행",
        "product_type": "SAVINGS",
    }
    base.update(overrides)
    return FinanceProduct(**base)


def test_returns_none_when_no_term_info():
    product = _product()
    assert compute_term_fit(product, date.today() + timedelta(days=365)) is None


def test_returns_none_when_no_departure_date():
    product = _product(contract_months=12)
    assert compute_term_fit(product, None) is None


def test_green_when_maturity_well_before_departure():
    product = _product(contract_months=6)  # 만기 약 180일 후
    departure = date.today() + timedelta(days=180 + TERM_FIT_BUFFER_DAYS + 10)
    assert compute_term_fit(product, departure) == "GREEN"


def test_amber_when_maturity_close_to_departure():
    product = _product(contract_months=6)  # 만기 약 180일 후
    departure = date.today() + timedelta(days=180 + 5)  # 버퍼(30일) 이내로 근접
    assert compute_term_fit(product, departure) == "AMBER"


def test_red_when_maturity_after_departure_beyond_buffer():
    product = _product(contract_months=12)  # 만기 약 360일 후
    departure = date.today() + timedelta(days=30)  # 출국이 만기보다 훨씬 이름
    assert compute_term_fit(product, departure) == "RED"


def test_uses_term_months_range_min_when_contract_months_absent():
    product = _product(term_months_range={"min": 6, "max": 60})
    departure = date.today() + timedelta(days=180 + TERM_FIT_BUFFER_DAYS + 10)
    assert compute_term_fit(product, departure) == "GREEN"
