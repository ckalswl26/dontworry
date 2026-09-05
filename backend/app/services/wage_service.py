"""최저임금 정보. 시급/기준시간은 config에 이미 있는 값(source 인용됨)만 사용한다."""
from __future__ import annotations

from app.config import get_settings
from app.models.schemas import MinWageInfo
from app.services.source_service import get_sources

# 근로기준법 시행령 제6조 2항 - 주 5일, 1일 8시간(주 40시간) 근로자 기준 월 소정근로시간.
STANDARD_MONTHLY_HOURS = 209


def get_min_wage_info() -> MinWageInfo:
    settings = get_settings()
    return MinWageInfo(
        year=2026,
        hourly_wage=settings.min_wage_2026,
        standard_monthly_hours=STANDARD_MONTHLY_HOURS,
        sources=get_sources(["MOEL_MIN_WAGE_2026"]),
        calculator_url="https://www.moel.go.kr/miniWageMain.do",
    )
