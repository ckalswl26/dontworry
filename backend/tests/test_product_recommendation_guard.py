from app.models.schemas import FinanceProduct, ProductEligibility, UserFinanceProfile
from app.services import ai_service

CANDIDATES = [
    FinanceProduct(
        product_id="NH_K_FOREIGNER_CREDIT_LOAN",
        product_name="NH K-외국인신용대출",
        bank="NH농협은행",
        product_type="LOAN",
        eligibility=ProductEligibility(visa_types=["E-9"], requires_arc=True, min_tenure_months=6),
        notes_ko="재직 6개월 이상 필요",
    ),
]

PROFILE = UserFinanceProfile(nationality="VN", visa_type="E-9", has_arc=True, tenure_months=8)


class _FakeToolUseBlock:
    type = "tool_use"

    def __init__(self, input_):
        self.input = input_


class _FakeResponse:
    def __init__(self, input_):
        self.content = [_FakeToolUseBlock(input_)]


class _FakeMessages:
    def __init__(self, input_):
        self._input = input_

    def create(self, **kwargs):
        return _FakeResponse(self._input)


class _FakeClient:
    def __init__(self, input_):
        self.messages = _FakeMessages(input_)


def test_out_of_catalog_product_id_is_rejected_and_falls_back(monkeypatch):
    bad_payload = {
        "ranked_product_ids": ["PRODUCT_THAT_DOES_NOT_EXIST"],
        "reasoning_per_product": [{"product_id": "PRODUCT_THAT_DOES_NOT_EXIST", "why": "그럴듯한 이유"}],
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(bad_payload))

    recommendations, ai_generated = ai_service.generate_product_recommendations(CANDIDATES, PROFILE)

    assert ai_generated is False
    valid_ids = {c.product_id for c in CANDIDATES}
    assert all(r.product_id in valid_ids for r in recommendations)


def test_in_catalog_product_id_is_accepted(monkeypatch):
    good_payload = {
        "ranked_product_ids": ["NH_K_FOREIGNER_CREDIT_LOAN"],
        "reasoning_per_product": [{"product_id": "NH_K_FOREIGNER_CREDIT_LOAN", "why": "재직 8개월로 조건 충족"}],
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(good_payload))

    recommendations, ai_generated = ai_service.generate_product_recommendations(CANDIDATES, PROFILE)

    assert ai_generated is True
    assert [r.product_id for r in recommendations] == ["NH_K_FOREIGNER_CREDIT_LOAN"]


def test_no_client_uses_deterministic_fallback():
    recommendations, ai_generated = ai_service.generate_product_recommendations(CANDIDATES, PROFILE)
    assert ai_generated is False
    assert len(recommendations) == 1
    assert recommendations[0].product_id == "NH_K_FOREIGNER_CREDIT_LOAN"


def test_empty_candidates_returns_empty_without_calling_llm():
    recommendations, ai_generated = ai_service.generate_product_recommendations([], PROFILE)
    assert recommendations == []
    assert ai_generated is False
