import pytest

from app.models.schemas import UserProfile
from app.services.ai_service import _fallback_intent


PROFILE = UserProfile(nationality="VN", visa_type="E-9")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("계좌를 해지하고 싶어요", "account_closure"),
        ("I need to close account", "account_closure"),
        ("Tôi muốn đóng tài khoản", "account_closure"),
        ("我要关闭账户", "account_closure"),
        ("অ্যাকাউন্ট বন্ধ করতে চাই", "account_closure"),
        ("본국송금 서류가 필요해요", "overseas_remittance"),
        ("How do I make a remittance?", "overseas_remittance"),
        ("如何办理海外汇款", "overseas_remittance"),
        ("국민연금 반환일시금을 받고 싶어요", "pension_refund"),
        ("Tôi muốn nhận lương hưu", "pension_refund"),
        ("养老金怎么领取", "pension_refund"),
        ("출국만기보험을 확인해줘", "maturity_insurance"),
        ("return cost insurance documents", "return_cost_insurance"),
        ("出境申报需要什么", "departure_notification"),
    ],
)
def test_multilingual_keywords_resolve_to_expected_intent(text: str, expected: str):
    result = _fallback_intent(text, PROFILE)
    assert expected in result.intent_candidates
    assert result.out_of_scope is False


@pytest.mark.parametrize("text", ["그거 서류는 뭐가 필요해?", "what documents do I need for that?", "那个需要什么材料？", "ওটার কাগজপত্র কী?"])
def test_multilingual_follow_up_uses_confirmed_context(text: str):
    result = _fallback_intent(text, PROFILE, "account_closure")
    assert result.intent_candidates == ["account_closure"]
    assert result.context_used is True
