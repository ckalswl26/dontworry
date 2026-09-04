from app.services import product_service


def test_ended_products_excluded_from_whitelist():
    products = product_service.get_whitelisted_products()
    ids = [p.product_id for p in products]
    assert "KINFA_EMPLOYEE_HESSAL_LEGACY" not in ids


def test_active_products_included():
    products = product_service.get_whitelisted_products()
    ids = [p.product_id for p in products]
    assert "KB_GLOBAL_STAR_SAVINGS" in ids


def test_no_product_claims_guaranteed_approval():
    products = product_service.get_whitelisted_products()
    forbidden_phrases = ["승인이 됩니다", "가입 가능합니다", "무조건 받을 수 있습니다"]
    for p in products:
        for phrase in forbidden_phrases:
            assert phrase not in p.disclaimer
