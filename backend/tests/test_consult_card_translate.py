from app.services import ai_service


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


DOCS_KO = ["여권", "외국인등록증", "통장 사본"]


def test_no_client_falls_back_to_korean_untranslated():
    result = ai_service.translate_consult_card("계좌 정리", DOCS_KO, "출국예정신고", "vi")
    assert result["translated"] is False
    assert result["visit_purpose"] == "계좌 정리"
    assert result["required_documents"] == DOCS_KO


def test_document_count_mismatch_is_rejected_and_falls_back(monkeypatch):
    # 항목이 하나 누락된 번역 - 새 정보를 빠뜨린 것이므로 신뢰하면 안 된다.
    bad_payload = {
        "visit_purpose": "Đóng tài khoản",
        "required_documents": ["Hộ chiếu", "Thẻ đăng ký người nước ngoài"],
        "judgement_basis": "Thông báo dự định xuất cảnh",
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(bad_payload))

    result = ai_service.translate_consult_card("계좌 정리", DOCS_KO, "출국예정신고", "vi")

    assert result["translated"] is False
    assert result["required_documents"] == DOCS_KO


def test_valid_translation_with_matching_item_count_is_accepted(monkeypatch):
    good_payload = {
        "visit_purpose": "Đóng tài khoản",
        "required_documents": ["Hộ chiếu", "Thẻ đăng ký người nước ngoài", "Bản sao sổ tiết kiệm"],
        "judgement_basis": "Thông báo dự định xuất cảnh",
    }
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(good_payload))

    result = ai_service.translate_consult_card("계좌 정리", DOCS_KO, "출국예정신고", "vi")

    assert result["translated"] is True
    assert len(result["required_documents"]) == len(DOCS_KO)
    assert result["visit_purpose"] == "Đóng tài khoản"


def test_empty_visit_purpose_in_response_is_rejected(monkeypatch):
    bad_payload = {"visit_purpose": "", "required_documents": DOCS_KO, "judgement_basis": "x"}
    monkeypatch.setattr(ai_service, "_get_client", lambda: _FakeClient(bad_payload))

    result = ai_service.translate_consult_card("계좌 정리", DOCS_KO, "출국예정신고", "vi")

    assert result["translated"] is False
