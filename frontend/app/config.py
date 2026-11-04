"""Application configuration via environment variables (.env supported).

Centralizes all environment settings for the SeatWise backend, separating
environment-specific conflicts (local, Docker, Vercel, Supabase) from core business logic.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Environment & Diagnostics
    environment: str = "development"
    debug: bool = False
    institution_name: str = "Jain (Deemed-to-be University)"
    institution_campus: str = "Faculty of Engineering and Technology (FET)"

    # Supabase Connection
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Application Routing & Security
    api_v1_prefix: str = "/api"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://localhost:8080,https://frontend-lyart-nu-63.vercel.app"
    solver_time_limit_seconds: float = 20.0

    @property
    def cors_origin_list(self) -> List[str]:
        """Parsed list of allowed origins from comma-delimited string."""
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def is_database_configured(self) -> bool:
        """Indicates if Supabase URL and service role key are present."""
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def is_development(self) -> bool:
        return not self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()
