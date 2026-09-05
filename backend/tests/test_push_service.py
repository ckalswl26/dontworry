from datetime import date, timedelta

import pytest

from app.services import push_service


class _FakeSettings:
    def __init__(self, database_url="postgresql://x", vapid_private_key_b64="cHJpdg==", vapid_public_key="pub", push_cron_secret="s"):
        self.database_url = database_url
        self.vapid_private_key_b64 = vapid_private_key_b64
        self.vapid_public_key = vapid_public_key
        self.vapid_contact_email = "test@example.com"
        self.push_cron_secret = push_cron_secret


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeConn:
    def __init__(self, rows):
        self._rows = rows
        self.executed = []
        self.committed = False
        self.closed = False

    def execute(self, sql, params=None):
        self.executed.append((sql.strip().split()[0], params))
        return _FakeCursor(self._rows)

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_is_configured_requires_all_three_settings(monkeypatch):
    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings(database_url=""))
    assert push_service.is_configured() is False

    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings())
    assert push_service.is_configured() is True


def test_send_due_notifications_skips_when_not_configured(monkeypatch):
    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings(database_url=""))
    result = push_service.send_due_notifications()
    assert result == {"sent": 0, "skipped": "not_configured"}


def test_send_due_notifications_sends_for_visit_prep_milestone(monkeypatch):
    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings())
    visit_prep_date = date.today() + timedelta(days=14)
    rows = [("endpoint-1", "p256dh", "auth", visit_prep_date, "ko", "")]
    fake_conn = _FakeConn(rows)
    monkeypatch.setattr(push_service, "_get_conn", lambda: fake_conn)
    monkeypatch.setattr(push_service, "_private_pem", lambda: b"fake-pem")

    sent_calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kwargs: sent_calls.append(kwargs))

    result = push_service.send_due_notifications()

    assert result == {"sent": 1}
    assert len(sent_calls) == 1
    assert fake_conn.committed is True
    # notified_milestones should have been updated to include visit_prep
    update_calls = [p for name, p in fake_conn.executed if name == "UPDATE"]
    assert update_calls and update_calls[0][0] == push_service.VISIT_PREP


def test_send_due_notifications_skips_already_notified(monkeypatch):
    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings())
    departure_today = date.today()
    rows = [("endpoint-1", "p256dh", "auth", departure_today, "ko", push_service.DEPARTURE_DAY)]
    fake_conn = _FakeConn(rows)
    monkeypatch.setattr(push_service, "_get_conn", lambda: fake_conn)

    sent_calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kwargs: sent_calls.append(kwargs))

    result = push_service.send_due_notifications()

    assert result == {"sent": 0}
    assert sent_calls == []


def test_send_due_notifications_ignores_non_milestone_dates(monkeypatch):
    monkeypatch.setattr(push_service, "get_settings", lambda: _FakeSettings())
    far_future = date.today() + timedelta(days=40)
    rows = [("endpoint-1", "p256dh", "auth", far_future, "ko", "")]
    fake_conn = _FakeConn(rows)
    monkeypatch.setattr(push_service, "_get_conn", lambda: fake_conn)

    sent_calls = []
    monkeypatch.setattr(push_service, "webpush", lambda **kwargs: sent_calls.append(kwargs))

    result = push_service.send_due_notifications()

    assert result == {"sent": 0}
    assert sent_calls == []


def test_save_subscription_requires_database_url(monkeypatch):
    monkeypatch.setattr(push_service, "_get_conn", lambda: None)
    with pytest.raises(RuntimeError):
        push_service.save_subscription("e", push_service.PushKeys(p256dh="a", auth="b"), None, "ko")
