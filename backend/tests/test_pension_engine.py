from datetime import date, timedelta

from app.models.schemas import PensionRequest
from app.rules import pension_engine


def test_vietnam_e9_nps_enrolled_not_excluded_by_nationality():
    """핵심 회귀 테스트: 베트남 E-9 NPS 가입자는 국적 때문에 제외되면 안 된다."""
    req = PensionRequest(nationality="VN", visa_type="E-9", nps_enrolled=True)
    result = pension_engine.evaluate(req)

    assert result.eligible is True
    assert result.matched_rule == "VISA_BASED"
    assert "베트남" not in result.reason
    assert "제외" not in result.reason


def test_h2_nps_enrolled_eligible_visa_based():
    req = PensionRequest(nationality="CN", visa_type="H-2", nps_enrolled=True)
    result = pension_engine.evaluate(req)
    assert result.eligible is True
    assert result.matched_rule == "VISA_BASED"


def test_e8_legacy_vs_seasonal_differ():
    legacy = pension_engine.evaluate(
        PensionRequest(nationality="TH", visa_type="E-8_LEGACY_TRAINING_EMPLOYMENT", nps_enrolled=True)
    )
    seasonal = pension_engine.evaluate(
        PensionRequest(nationality="TH", visa_type="E-8_SEASONAL_WORK", nps_enrolled=True)
    )
    assert legacy.eligible is True
    assert seasonal.eligible is False
    assert legacy.matched_rule != seasonal.matched_rule
    assert seasonal.reason_code == "E8_SEASONAL_NOT_ELIGIBLE"


def test_ambiguous_e8_requires_clarification():
    result = pension_engine.evaluate(PensionRequest(nationality="TH", visa_type="E-8", nps_enrolled=True))
    assert result.matched_rule == "AMBIGUOUS"
    assert result.eligible is False


def test_not_enrolled_never_eligible():
    result = pension_engine.evaluate(PensionRequest(nationality="VN", visa_type="E-9", nps_enrolled=False))
    assert result.eligible is False
    assert result.reason_code == "NOT_NPS_MEMBER"


def test_agreement_based_country_eligible_without_visa_match():
    result = pension_engine.evaluate(PensionRequest(nationality="US", visa_type="F-4", nps_enrolled=True))
    assert result.eligible is True
    assert result.matched_rule == "AGREEMENT_BASED"


def test_reciprocity_minimum_months_not_met():
    result = pension_engine.evaluate(
        PensionRequest(nationality="TH", visa_type="F-4", nps_enrolled=True, nps_insured_months=5)
    )
    assert result.eligible is False
    assert result.matched_rule == "RECIPROCITY_BASED_INSUFFICIENT_MONTHS"


def test_unknown_country_visa_combo_is_additional_review():
    result = pension_engine.evaluate(PensionRequest(nationality="ZZ", visa_type="F-4", nps_enrolled=True))
    assert result.eligible is False
    assert result.matched_rule == "UNKNOWN"
    assert result.reason_code == "ADDITIONAL_REVIEW_REQUIRED"


def test_claimable_now_within_30_days_before_departure():
    req = PensionRequest(
        nationality="VN",
        visa_type="E-9",
        nps_enrolled=True,
        departure_date=date.today() + timedelta(days=10),
        departure_confirmed=False,
    )
    result = pension_engine.evaluate(req)
    assert result.claimable_now is True
    assert result.payable_now is False


def test_payable_now_requires_departure_confirmed():
    req = PensionRequest(nationality="VN", visa_type="E-9", nps_enrolled=True, departure_confirmed=True)
    result = pension_engine.evaluate(req)
    assert result.payable_now is True
    assert result.claimable_now is True
