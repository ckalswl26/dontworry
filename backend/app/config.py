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
    justice_stats_api_key: str = ""
    cors_allow_origins: str = "http://localhost:3000"

    min_wage_2026: int = 10320
    median_income_1p_2026: int = 2_564_238

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
