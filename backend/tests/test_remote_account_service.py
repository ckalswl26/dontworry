from app.services import remote_account_service


def test_all_entries_have_source_and_verified_at():
    entries = remote_account_service.get_remote_account_opening()
    assert len(entries) > 0
    for entry in entries:
        assert entry.source_url.startswith("http")
        assert entry.verified_at


def test_supported_status_values_are_constrained():
    entries = remote_account_service.get_remote_account_opening()
    for entry in entries:
        assert entry.supported in ("yes", "pilot", "unconfirmed")


def test_tossbank_is_marked_supported():
    entries = remote_account_service.get_remote_account_opening()
    toss = next(e for e in entries if e.institution == "토스뱅크")
    assert toss.supported == "yes"


def test_jb_financial_group_banks_are_marked_pilot():
    entries = remote_account_service.get_remote_account_opening()
    jb_banks = [e for e in entries if e.institution in ("전북은행", "광주은행")]
    assert len(jb_banks) == 2
    for bank in jb_banks:
        assert bank.supported == "pilot"
