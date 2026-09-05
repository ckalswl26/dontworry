from fastapi import APIRouter, Header, HTTPException

from app.config import get_settings
from app.models.schemas import PushSubscribeRequest, PushUnsubscribeRequest
from app.services import push_service

router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/vapid-public-key")
def get_vapid_public_key():
    settings = get_settings()
    return {"public_key": settings.vapid_public_key, "configured": push_service.is_configured()}


@router.post("/subscribe")
def subscribe(req: PushSubscribeRequest):
    if not push_service.is_configured():
        raise HTTPException(status_code=503, detail="알림 기능이 아직 설정되지 않았습니다.")
    push_service.save_subscription(req.endpoint, req.keys, req.departure_date, req.lang)
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe(req: PushUnsubscribeRequest):
    if not push_service.is_configured():
        raise HTTPException(status_code=503, detail="알림 기능이 아직 설정되지 않았습니다.")
    push_service.delete_subscription(req.endpoint)
    return {"status": "unsubscribed"}


@router.post("/check")
def check(x_cron_secret: str = Header(default="")):
    settings = get_settings()
    if not settings.push_cron_secret or x_cron_secret != settings.push_cron_secret:
        raise HTTPException(status_code=401, detail="unauthorized")
    return push_service.send_due_notifications()
