from app.models.schemas import UserFinanceProfile
from app.services import product_matcher, product_service


def _find(products, product_id):
    return next((p for p in products if p.product_id == product_id), None)


def test_nh_loan_requires_arc_and_min_tenure():
    all_products = product_service.get_whitelisted_products()

    eligible_profile = UserFinanceProfile(
        nationality="VN", visa_type="E-9", has_arc=True, tenure_months=8
    )
    candidates = product_matcher.get_candidate_products(eligible_profile, all_products)
    assert _find(candidates, "NH_K_FOREIGNER_CREDIT_LOAN") is not None

    short_tenure_profile = UserFinanceProfile(
        nationality="VN", visa_type="E-9", has_arc=True, tenure_months=3
    )
    candidates = product_matcher.get_candidate_products(short_tenure_profile, all_products)
    assert _find(candidates, "NH_K_FOREIGNER_CREDIT_LOAN") is None

    no_arc_profile = UserFinanceProfile(
        nationality="VN", visa_type="E-9", has_arc=False, tenure_months=8
    )
    candidates = product_matcher.get_candidate_products(no_arc_profile, all_products)
    assert _find(candidates, "NH_K_FOREIGNER_CREDIT_LOAN") is None


def test_nh_loan_excludes_visa_types_not_listed():
    all_products = product_service.get_whitelisted_products()
    profile = UserFinanceProfile(nationality="TH", visa_type="H-2", has_arc=True, tenure_months=12)
    candidates = product_matcher.get_candidate_products(profile, all_products)
    assert _find(candidates, "NH_K_FOREIGNER_CREDIT_LOAN") is None


def test_isa_requires_tax_residency_regardless_of_visa_type():
    all_products = product_service.get_whitelisted_products()

    resident_profile = UserFinanceProfile(nationality="VN", visa_type="E-9", is_tax_resident=True)
    candidates = product_matcher.get_candidate_products(resident_profile, all_products)
    assert _find(candidates, "ISA_GENERAL") is not None

    non_resident_profile = UserFinanceProfile(nationality="VN", visa_type="E-9", is_tax_resident=False)
    candidates = product_matcher.get_candidate_products(non_resident_profile, all_products)
    assert _find(candidates, "ISA_GENERAL") is None

    unknown_residency_profile = UserFinanceProfile(nationality="VN", visa_type="E-9")
    candidates = product_matcher.get_candidate_products(unknown_residency_profile, all_products)
    assert _find(candidates, "ISA_GENERAL") is None


def test_shinhan_sol_global_loan_requires_visa_remaining_strictly_over_6_months():
    all_products = product_service.get_whitelisted_products()

    eligible_profile = UserFinanceProfile(
        nationality="VN", visa_type="E-9", has_arc=True, visa_remaining_months=7
    )
    candidates = product_matcher.get_candidate_products(eligible_profile, all_products)
    assert _find(candidates, "SHINHAN_SOL_GLOBAL_LOAN") is not None

    exactly_6_profile = UserFinanceProfile(
        nationality="VN", visa_type="E-9", has_arc=True, visa_remaining_months=6
    )
    candidates = product_matcher.get_candidate_products(exactly_6_profile, all_products)
    assert _find(candidates, "SHINHAN_SOL_GLOBAL_LOAN") is None


def test_ended_product_never_appears_as_candidate():
    all_products = product_service.get_whitelisted_products()
    profile = UserFinanceProfile(nationality="VN", visa_type="E-9", has_arc=True, tenure_months=24)
    candidates = product_matcher.get_candidate_products(profile, all_products)
    assert _find(candidates, "KINFA_EMPLOYEE_HESSAL_LEGACY") is None


def test_purpose_filter_narrows_candidates():
    all_products = product_service.get_whitelisted_products()
    profile = UserFinanceProfile(nationality="VN", visa_type="E-9", has_arc=True, purpose="송금")
    candidates = product_matcher.get_candidate_products(profile, all_products)
    assert _find(candidates, "WIREBARLEY_REMITTANCE") is not None
    assert _find(candidates, "ISA_GENERAL") is None  # 저축/투자 태그만 있어 송금 목적과 불일치


def test_housing_subscription_caution_survives_into_fallback_recommendation():
    from app.services import ai_service

    all_products = product_service.get_whitelisted_products()
    profile = UserFinanceProfile(nationality="VN", visa_type="E-9", has_arc=True)
    candidates = product_matcher.get_candidate_products(profile, all_products)
    housing = _find(candidates, "HOUSING_SUBSCRIPTION_SAVINGS")
    assert housing is not None

    recommendations = ai_service._fallback_product_recommendations([housing], profile)
    assert recommendations[0].caution_ko is not None
    assert "당첨" in recommendations[0].caution_ko
