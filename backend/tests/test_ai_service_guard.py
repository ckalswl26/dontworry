from types import SimpleNamespace

from app.services import ai_service

CANDIDATES = [
    {"action_id": "ACT-REMIT-ADJUST", "title_ko": "송금 조정", "category": "SAVINGS", "trigger_signal": "savings_goal_met_false"},
    {"action_id": "ACT-DOC-PREP", "title_ko": "서류 준비", "category": "DOCUMENTS", "trigger_signal": "document_readiness_low"},
]

CRISIS_SIGNALS = {"savings_goal_met": False, "shortfall_amount": 200000, "document_readiness_pct": 72}


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


def test_out_of_catalog_action_id_is_rejected_and_falls_back(monkeypatch):
    bad_payload = {
        "ranked_action_ids": ["ACT-MADE-UP-BY-MODEL"],
        "reasoning_per_action": [{"action_id": "ACT-MADE-UP-BY-MODEL", "why": "이유"}],
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(bad_payload))

    actions, ai_generated = ai_service.rank_actions(CRISIS_SIGNALS, CANDIDATES)

    assert ai_generated is False
    valid_ids = {c["action_id"] for c in CANDIDATES}
    assert all(a.action_id in valid_ids for a in actions)


def test_in_catalog_action_ids_are_accepted(monkeypatch):
    good_payload = {
        "ranked_action_ids": ["ACT-REMIT-ADJUST"],
        "reasoning_per_action": [{"action_id": "ACT-REMIT-ADJUST", "why": "부족액 근거 설명"}],
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(good_payload))

    actions, ai_generated = ai_service.rank_actions(CRISIS_SIGNALS, CANDIDATES)

    assert ai_generated is True
    assert [a.action_id for a in actions] == ["ACT-REMIT-ADJUST"]


def test_no_client_uses_deterministic_fallback():
    actions, ai_generated = ai_service.rank_actions(CRISIS_SIGNALS, CANDIDATES)
    assert ai_generated is False
    assert len(actions) > 0
