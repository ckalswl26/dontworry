from fastapi import APIRouter, HTTPException

from app.services import source_service

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("/{source_id}")
def get_source(source_id: str):
    row = source_service.get_raw_source(source_id)
    if row is None:
        raise HTTPException(status_code=404, detail="SOURCE_NOT_FOUND")
    return row


@router.get("")
def list_sources():
    return {"sources": source_service.all_sources()}
