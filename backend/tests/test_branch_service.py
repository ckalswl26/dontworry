from app.services import branch_service


class _FakeSettings:
    def __init__(self, kakao_rest_api_key: str = "test-key"):
        self.kakao_rest_api_key = kakao_rest_api_key


def test_missing_api_key_returns_unavailable_not_a_crash(monkeypatch):
    monkeypatch.setattr(branch_service, "get_settings", lambda: _FakeSettings(kakao_rest_api_key=""))

    result = branch_service.search_nearby(37.5, 127.0)

    assert result.available is False
    assert result.error
    assert result.branches == []


def test_kakao_call_failure_degrades_gracefully(monkeypatch):
    monkeypatch.setattr(branch_service, "get_settings", lambda: _FakeSettings())

    def boom(url, params, api_key):
        raise RuntimeError("network down")

    monkeypatch.setattr(branch_service, "_call_kakao", boom)
    result = branch_service.search_nearby(37.5, 127.0)

    assert result.available is False
    assert result.error
    assert result.branches == []


def test_parse_document_tags_known_shinhan_sunday_branch():
    doc = {
        "place_name": "신한은행 동대문지점",
        "address_name": "서울 중구 마장로 11",
        "road_address_name": "서울 중구 마장로 11",
        "phone": "02-000-0000",
        "x": "127.0123",
        "y": "37.5678",
        "distance": "150",
        "place_url": "http://place.map.kakao.com/1",
    }

    parsed = branch_service._parse_document(doc)

    assert parsed.bank == "신한은행"
    assert parsed.sunday_branch is True
    assert parsed.sunday_branch_source_id == "SHINHAN_SUNDAY_FOREIGN_BRANCHES"
    assert parsed.lat == 37.5678
    assert parsed.lng == 127.0123


def test_parse_document_tags_sunday_branch_by_address_when_kakao_name_omits_jijeom():
    """카카오 실제 데이터는 '동대문지점'이 아니라 '동대문'으로만 등록돼 있어
    지점명 부분일치로는 놓친다 - 도로명 주소 대조로 잡아내야 한다."""
    doc = {
        "place_name": "신한은행 동대문",
        "address_name": "서울 중구 신당동 775",
        "road_address_name": "서울 중구 마장로 11",
        "x": "127.0114",
        "y": "37.5684",
    }

    parsed = branch_service._parse_document(doc)

    assert parsed.sunday_branch is True
    assert parsed.sunday_branch_source_id == "SHINHAN_SUNDAY_FOREIGN_BRANCHES"


def test_parse_document_does_not_tag_unrelated_branch_as_sunday():
    doc = {
        "place_name": "신한은행 강남지점",
        "address_name": "서울 강남구",
        "x": "127.0",
        "y": "37.5",
    }

    parsed = branch_service._parse_document(doc)

    assert parsed.sunday_branch is False
    assert parsed.sunday_branch_note is None
    assert parsed.sunday_branch_source_id is None


def test_parse_document_never_fabricates_missing_fields():
    doc = {"place_name": "이름모를은행 지점", "x": "127.0", "y": "37.5"}

    parsed = branch_service._parse_document(doc)

    assert parsed.address is None
    assert parsed.phone is None
    assert parsed.distance_m is None


def test_search_by_keyword_combines_bank_and_query(monkeypatch):
    monkeypatch.setattr(branch_service, "get_settings", lambda: _FakeSettings())
    captured = {}

    def fake_call(url, params, api_key):
        captured["params"] = params
        return []

    monkeypatch.setattr(branch_service, "_call_kakao", fake_call)
    branch_service.search_by_keyword("KB국민은행", "강남")

    assert captured["params"]["query"] == "KB국민은행 강남"
    assert captured["params"]["category_group_code"] == branch_service.BANK_CATEGORY_CODE
