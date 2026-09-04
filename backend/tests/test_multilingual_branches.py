from app.services import location_service


def test_all_branches_have_a_cited_source():
    """확인 안 된 지점 정보를 지어내지 않는다는 원칙 - 모든 지점은 source_id를 가져야 한다."""
    branches = location_service.get_multilingual_branches()
    assert len(branches) > 0
    for b in branches:
        assert b.source_id
        assert b.last_verified_at


def test_kb_branches_have_addresses_and_official_authority_grade():
    branches = location_service.get_multilingual_branches(bank="KB국민은행")
    assert len(branches) >= 8
    for b in branches:
        assert b.authority_grade == "A"


def test_shinhan_branches_are_graded_as_news_sourced_not_official():
    branches = location_service.get_multilingual_branches(bank="신한은행")
    assert len(branches) == 3
    for b in branches:
        assert b.authority_grade == "C"
        assert b.address is not None


def test_filter_by_bank():
    all_branches = location_service.get_multilingual_branches()
    kb_only = location_service.get_multilingual_branches(bank="KB국민은행")
    assert len(kb_only) < len(all_branches)
    assert all(b.bank == "KB국민은행" for b in kb_only)
