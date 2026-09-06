import pytest

from app.config import Settings
from app.services import fss_service, product_service


@pytest.fixture(autouse=True)
def _no_fss_api_key(monkeypatch):
    # 로컬 .env에 실제 FSS_API_KEY가 있어도, 이 테스트들은 "키 미설정" 샘플 데이터
    # 경로를 검증하는 것이 목적이므로 강제로 빈 키를 주입한다.
    monkeypatch.setattr(fss_service, "get_settings", lambda: Settings(fss_api_key=""))


def test_fss_savings_falls_back_to_labeled_sample_data_without_api_key():
    result = product_service.get_fss_savings()
    assert result["error"] is None
    assert result["is_sample_data"] is True
    assert len(result["products"]) > 0
    assert all(p.is_sample_data for p in result["products"])


def test_fss_deposits_falls_back_to_labeled_sample_data_without_api_key():
    result = product_service.get_fss_deposits()
    assert result["is_sample_data"] is True
    assert all(p.is_sample_data for p in result["products"])


def test_fss_product_whitelist_match_by_bank_name():
    # 화이트리스트에 없는 샘플은행은 미확인으로 표시되고 낮은 우선순위가 되도록
    # is_whitelisted=False + 안내 문구가 붙어야 한다.
    result = product_service.get_fss_savings()
    for p in result["products"]:
        assert p.is_whitelisted is False
        assert "확인 필요" in p.notes_ko


def test_fss_with_api_key_returns_real_flag_and_matches_whitelisted_bank(monkeypatch):
    # 키가 있으면(네트워크 호출은 모킹) is_sample_data가 즉시 False로 바뀌고,
    # 화이트리스트에 실제로 등재된 은행명(신한은행)은 is_whitelisted=True가 되어야 한다.
    monkeypatch.setattr(fss_service, "get_settings", lambda: Settings(fss_api_key="dummy-real-key"))
    monkeypatch.setattr(
        fss_service,
        "_fetch_all_pages",
        lambda endpoint: [
            {
                "product_id": "REAL0001:P1",
                "product_name": "신한 진짜 적금",
                "bank": "신한은행",
                "base_rate": 3.0,
                "max_rate": 3.5,
                "contract_months_options": ["12"],
                "rate_as_of": "202601",
                "status": "ACTIVE",
            },
            {
                "product_id": "REAL0002:P2",
                "product_name": "미확인은행 적금",
                "bank": "듣보은행",
                "base_rate": 3.0,
                "max_rate": 3.5,
                "contract_months_options": ["12"],
                "rate_as_of": "202601",
                "status": "ACTIVE",
            },
        ],
    )

    result = product_service.get_fss_savings()
    assert result["is_sample_data"] is False
    by_id = {p.product_id: p for p in result["products"]}
    assert by_id["REAL0001:P1"].is_whitelisted is True
    assert by_id["REAL0001:P1"].is_sample_data is False
    assert by_id["REAL0002:P2"].is_whitelisted is False
    assert "확인 필요" in by_id["REAL0002:P2"].notes_ko


def test_get_all_matchable_products_combines_whitelist_and_fss():
    products = product_service.get_all_matchable_products()
    whitelist_ids = {p.product_id for p in product_service.get_whitelisted_products()}
    fss_ids = {p.product_id for p in product_service.get_fss_savings()["products"]}
    fss_ids |= {p.product_id for p in product_service.get_fss_deposits()["products"]}
    all_ids = {p.product_id for p in products}
    assert whitelist_ids <= all_ids
    assert fss_ids <= all_ids
