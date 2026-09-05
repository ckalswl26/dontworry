from app.services import guide_service, wage_service


def test_wage_claim_guide_has_real_cited_sources():
    guide = guide_service.get_guide("wage_claim")
    assert guide is not None
    assert len(guide.sources) >= 1
    for source in guide.sources:
        assert source.source_url
        assert source.authority_grade == "A"


def test_reentry_guide_has_real_cited_sources():
    guide = guide_service.get_guide("reentry_special_case")
    assert guide is not None
    assert len(guide.sources) >= 1


def test_unknown_guide_returns_none():
    assert guide_service.get_guide("does_not_exist") is None


def test_list_guides_returns_all_seeded_guides():
    guides = guide_service.list_guides()
    ids = {g.guide_id for g in guides}
    assert {"wage_claim", "reentry_special_case"} <= ids


def test_min_wage_info_matches_configured_value():
    info = wage_service.get_min_wage_info()
    assert info.hourly_wage == 10320
    assert info.standard_monthly_hours == 209
    assert len(info.sources) == 1
    assert info.sources[0].source_id == "MOEL_MIN_WAGE_2026"
