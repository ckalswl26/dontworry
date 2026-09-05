from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "seed"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    fss_api_key: str = ""
    anthropic_api_key: str = ""
    ecos_api_key: str = ""
    kakao_rest_api_key: str = ""
    justice_stats_api_key: str = ""
    database_url: str = ""
    vapid_private_key_b64: str = ""
    vapid_public_key: str = ""
    vapid_contact_email: str = "admin@example.com"
    push_cron_secret: str = ""
    cors_allow_origins: str = "http://localhost:3000"
    # Vercel은 배포마다 새 임시 URL(frontend-<hash>-<team>.vercel.app)을 만든다.
    # 매번 정확한 URL을 allow_origins에 추가하지 않아도 되도록, 이 프로젝트의
    # vercel.app 서브도메인 패턴은 정규식으로 통째로 허용한다.
    cors_allow_origin_regex: str = r"^https://frontend-[a-z0-9-]+\.vercel\.app$"

    min_wage_2026: int = 10320
    median_income_1p_2026: int = 2_564_238

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
