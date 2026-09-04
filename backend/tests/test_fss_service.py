from app.services.fss_service import _merge


def test_merge_base_and_option_by_fin_co_and_prdt_cd():
    base_list = [
        {"fin_co_no": "0010001", "fin_prdt_cd": "P001", "fin_prdt_nm": "테스트예금", "kor_co_nm": "테스트은행", "dcls_month": "202608"},
    ]
    option_list = [
        {"fin_co_no": "0010001", "fin_prdt_cd": "P001", "intr_rate": 2.0, "intr_rate2": 3.5, "save_trm": "12"},
        {"fin_co_no": "0010001", "fin_prdt_cd": "P001", "intr_rate": 1.5, "intr_rate2": 3.0, "save_trm": "6"},
        {"fin_co_no": "9999999", "fin_prdt_cd": "OTHER", "intr_rate": 9.0, "intr_rate2": 9.9, "save_trm": "12"},
    ]

    merged = _merge(base_list, option_list)

    assert len(merged) == 1
    product = merged[0]
    assert product["product_id"] == "0010001:P001"
    assert product["base_rate"] == 1.5
    assert product["max_rate"] == 3.5
    assert set(product["contract_months_options"]) == {"6", "12"}


def test_merge_handles_missing_options_gracefully():
    base_list = [{"fin_co_no": "X", "fin_prdt_cd": "Y", "fin_prdt_nm": "노옵션상품", "kor_co_nm": "은행"}]
    merged = _merge(base_list, [])
    assert merged[0]["base_rate"] is None
    assert merged[0]["max_rate"] is None
