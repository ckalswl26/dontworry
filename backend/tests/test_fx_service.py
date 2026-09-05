from types import SimpleNamespace

import pytest

from app.services import fx_service


class _FakeSettings:
    def __init__(self, ecos_api_key: str = "test-key"):
        self.ecos_api_key = ecos_api_key


@pytest.fixture(autouse=True)
def _isolated_cache(monkeypatch):
    monkeypatch.setattr(fx_service, "_cache", {})


def test_missing_api_key_returns_unavailable_with_message_not_a_crash(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings(ecos_api_key=""))

    result = fx_service.get_fx_rates()

    assert result.available is False
    assert result.error
    assert result.rates == []
    assert result.unsupported == fx_service.UNSUPPORTED_CURRENCIES


def test_unsupported_currencies_never_have_an_item_code_mapping():
    """지원 안 되는 통화에는 절대 ECOS 항목 코드가 없어야 한다 - 임의 환율 생성 방지."""
    for currency in fx_service.UNSUPPORTED_CURRENCIES:
        assert currency not in fx_service.CURRENCY_ITEM_CODES


def test_fetch_rate_applies_unit_scale_for_100_unit_quoted_currencies(monkeypatch):
    fake_payload = {"StatisticSearch": {"row": [{"TIME": "20260904", "DATA_VALUE": "5.23"}]}}

    class _FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return fake_payload

    class _FakeClient:
        def get(self, url, timeout=5.0):
            return _FakeResp()

    rate = fx_service._fetch_rate(_FakeClient(), "test-key", "VND", "0000035")

    assert rate is not None
    assert rate.currency == "VND"
    assert rate.rate == pytest.approx(0.0523)
    assert rate.as_of == "2026-09-04"


def test_fetch_rate_returns_none_when_ecos_has_no_rows():
    fake_payload = {"StatisticSearch": None, "RESULT": {"CODE": "INFO-200"}}

    class _FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return fake_payload

    class _FakeClient:
        def get(self, url, timeout=5.0):
            return _FakeResp()

    rate = fx_service._fetch_rate(_FakeClient(), "test-key", "PHP", "0000034")
    assert rate is None


def test_get_fx_rates_caches_within_ttl_and_skips_refetch(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())
    call_count = {"n": 0}

    def fake_fetch_rate(client, api_key, currency, item_code):
        call_count["n"] += 1
        return fx_service.FxRate(currency=currency, rate=1.0, as_of="2026-09-05")

    monkeypatch.setattr(fx_service, "_fetch_rate", fake_fetch_rate)

    fx_service.get_fx_rates()
    first_call_count = call_count["n"]
    fx_service.get_fx_rates()

    assert first_call_count == len(fx_service.CURRENCY_ITEM_CODES)
    assert call_count["n"] == first_call_count  # 두 번째 호출은 캐시만 사용, 재호출 없음


def test_get_fx_rates_falls_back_to_stale_cache_on_fetch_failure(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())

    def working_fetch(client, api_key, currency, item_code):
        return fx_service.FxRate(currency=currency, rate=2.0, as_of="2026-09-05")

    monkeypatch.setattr(fx_service, "_fetch_rate", working_fetch)
    fx_service.get_fx_rates()  # 캐시 채우기
    fx_service.FX_CACHE_TTL_SECONDS  # (참고용) TTL 상수 존재 확인

    # 캐시를 즉시 만료시킨다
    for currency in list(fx_service._cache):
        fetched_at, rate = fx_service._cache[currency]
        fx_service._cache[currency] = (fetched_at - fx_service.FX_CACHE_TTL_SECONDS - 1, rate)

    def failing_fetch(client, api_key, currency, item_code):
        raise RuntimeError("ECOS 호출 실패")

    monkeypatch.setattr(fx_service, "_fetch_rate", failing_fetch)
    result = fx_service.get_fx_rates()

    assert result.available is True
    assert len(result.rates) == len(fx_service.CURRENCY_ITEM_CODES)
    assert all(r.rate == 2.0 for r in result.rates)


def test_get_fx_rates_reports_unavailable_when_every_fetch_fails(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())

    def failing_fetch(client, api_key, currency, item_code):
        raise RuntimeError("ECOS 호출 실패")

    monkeypatch.setattr(fx_service, "_fetch_rate", failing_fetch)
    result = fx_service.get_fx_rates()

    assert result.available is False
    assert result.error
    assert result.rates == []


class _FakeHistClient:
    def __init__(self, payload):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url, timeout=8.0):
        class _Resp:
            def raise_for_status(_self):
                pass

            def json(_self):
                return self._payload

        return _Resp()


def test_get_fx_history_rejects_unsupported_currency(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())
    result = fx_service.get_fx_history("KHR", "1m")
    assert result.available is False
    assert result.error
    assert result.points == []


def test_get_fx_history_missing_api_key_returns_unavailable(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings(ecos_api_key=""))
    result = fx_service.get_fx_history("VND", "1m")
    assert result.available is False
    assert result.error


def test_get_fx_history_parses_points_with_unit_scale(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())
    payload = {
        "StatisticSearch": {
            "row": [
                {"TIME": "20260901", "DATA_VALUE": "5.20"},
                {"TIME": "20260902", "DATA_VALUE": "5.25"},
            ]
        }
    }
    monkeypatch.setattr(fx_service.httpx, "Client", lambda: _FakeHistClient(payload))

    result = fx_service.get_fx_history("VND", "1m")

    assert result.available is True
    assert len(result.points) == 2
    assert result.points[0].date == "2026-09-01"
    assert result.points[0].rate == pytest.approx(0.052)
    assert result.points[1].rate == pytest.approx(0.0525)


def test_get_fx_history_no_rows_returns_unavailable(monkeypatch):
    monkeypatch.setattr(fx_service, "get_settings", lambda: _FakeSettings())
    monkeypatch.setattr(fx_service.httpx, "Client", lambda: _FakeHistClient({"StatisticSearch": {"row": []}}))

    result = fx_service.get_fx_history("VND", "5y")

    assert result.available is False
    assert result.error
