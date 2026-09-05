"""웹 푸시 알림 (D-14 방문 준비 / 출국일 리마인더).

역할 경계:
- 구독 정보(브라우저 endpoint)와 출국예정일만 저장한다 - 이름/국적/재정정보 등
  다른 개인정보는 절대 이 테이블에 넣지 않는다.
- Render 무료 플랜은 디스크가 휘발성이라 파일에는 저장할 수 없어서, 외부 무료
  Postgres(DATABASE_URL)를 쓴다. DATABASE_URL/VAPID 키가 없으면 기능을 조용히
  끈다 - 앱이 죽지 않는다 (다른 API 키 fallback과 동일한 패턴).
- 실제 발송은 GitHub Actions 크론이 하루 한 번 /api/push/check를 호출해서 트리거한다
  (Render 무료 플랜엔 자체 크론이 없음).
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import date

import psycopg
from pywebpush import WebPushException, webpush

from app.config import get_settings
from app.models.schemas import PushKeys
from app.services.calculator import EARLY_VISIT_NOTICE_OFFSET

logger = logging.getLogger(__name__)

VISIT_PREP = "visit_prep"
DEPARTURE_DAY = "departure_day"

MESSAGES: dict[str, dict[str, tuple[str, str]]] = {
    VISIT_PREP: {
        "ko": ("방문 준비 시간이에요", "D-14! 은행 방문이 필요한 업무를 미리 준비해두세요."),
        "en": ("Time to prepare for your visit", "D-14! Get ready for tasks that need a bank visit."),
        "vi": ("Đến lúc chuẩn bị rồi", "Còn 14 ngày! Hãy chuẩn bị trước cho các thủ tục cần đến ngân hàng."),
    },
    DEPARTURE_DAY: {
        "ko": ("출국일이에요", "오늘이 출국 예정일이에요. 준비한 서류를 다시 확인하세요."),
        "en": ("It's departure day", "Today is your planned departure date. Double-check your documents."),
        "vi": ("Hôm nay là ngày xuất cảnh", "Hôm nay là ngày dự định xuất cảnh của bạn. Hãy kiểm tra lại giấy tờ."),
    },
}


def _get_conn() -> psycopg.Connection | None:
    settings = get_settings()
    if not settings.database_url:
        return None
    return psycopg.connect(settings.database_url)


def _ensure_table(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            endpoint TEXT PRIMARY KEY,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            departure_date DATE,
            lang TEXT NOT NULL DEFAULT 'ko',
            notified_milestones TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def is_configured() -> bool:
    settings = get_settings()
    return bool(settings.database_url and settings.vapid_private_key_b64 and settings.vapid_public_key)


def save_subscription(endpoint: str, keys: PushKeys, departure_date: date | None, lang: str) -> None:
    conn = _get_conn()
    if conn is None:
        raise RuntimeError("DATABASE_URL not configured")
    with conn:
        _ensure_table(conn)
        conn.execute(
            """
            INSERT INTO push_subscriptions (endpoint, p256dh, auth, departure_date, lang)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (endpoint) DO UPDATE SET
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                departure_date = EXCLUDED.departure_date,
                lang = EXCLUDED.lang
            """,
            (endpoint, keys.p256dh, keys.auth, departure_date, lang),
        )
    conn.close()


def delete_subscription(endpoint: str) -> None:
    conn = _get_conn()
    if conn is None:
        raise RuntimeError("DATABASE_URL not configured")
    with conn:
        _ensure_table(conn)
        conn.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))
    conn.close()


def _private_pem() -> bytes:
    settings = get_settings()
    return base64.b64decode(settings.vapid_private_key_b64)


def send_due_notifications() -> dict:
    if not is_configured():
        return {"sent": 0, "skipped": "not_configured"}

    settings = get_settings()
    conn = _get_conn()
    assert conn is not None
    _ensure_table(conn)

    rows = conn.execute(
        "SELECT endpoint, p256dh, auth, departure_date, lang, notified_milestones "
        "FROM push_subscriptions WHERE departure_date IS NOT NULL"
    ).fetchall()

    today = date.today()
    sent = 0
    for endpoint, p256dh, auth, departure_date, lang, notified in rows:
        # days_left(=(departure - today).days)는 "출국까지 남은 일수"라 양수이고,
        # EARLY_VISIT_NOTICE_OFFSET(calculator.py)은 "출국 기준" 음수 오프셋이라 부호가 반대다.
        days_left = (departure_date - today).days
        if days_left == -EARLY_VISIT_NOTICE_OFFSET:
            milestone = VISIT_PREP
        elif days_left == 0:
            milestone = DEPARTURE_DAY
        else:
            continue

        already = [m for m in (notified or "").split(",") if m]
        if milestone in already:
            continue

        title, body = MESSAGES[milestone].get(lang, MESSAGES[milestone]["ko"])
        try:
            webpush(
                subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=_private_pem(),
                vapid_claims={"sub": f"mailto:{settings.vapid_contact_email}"},
            )
            sent += 1
            conn.execute(
                "UPDATE push_subscriptions SET notified_milestones = %s WHERE endpoint = %s",
                (",".join(already + [milestone]), endpoint),
            )
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                # 구독이 만료/해지된 브라우저 - 정리한다.
                conn.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))
            else:
                logger.exception("Push send failed for %s", endpoint)

    conn.commit()
    conn.close()
    return {"sent": sent}
