"""Application configuration. Source: ai-context/SHARED_CONTEXT.md (no secrets in code)

Every setting is read from the environment. Nothing is hardcoded.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    environment: str = Field(default="development", alias="ENVIRONMENT")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    cors_allow_origins: list[str] = Field(default_factory=list, alias="CORS_ALLOW_ORIGINS")

    # --- Database (SQLAlchemy async engine; Alembic uses its own DATABASE_URL — see alembic/env.py) ---
    database_url: str = Field(..., alias="DATABASE_URL_ASYNC")

    # --- Auth (Supabase) ---
    supabase_jwt_secret: str = Field(..., alias="SUPABASE_JWT_SECRET")
    supabase_jwt_algorithm: str = Field(default="HS256", alias="SUPABASE_JWT_ALGORITHM")

    # --- Storage (Supabase Storage) ---
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_storage_bucket: str = Field(default="videos", alias="SUPABASE_STORAGE_BUCKET")

    # --- Upload limits (docs/PRD.md > Upload) ---
    max_upload_size_bytes: int = Field(default=500 * 1024 * 1024, alias="MAX_UPLOAD_SIZE_BYTES")
    allowed_upload_content_types: tuple[str, ...] = (
        "video/mp4",
        "video/quicktime",  # .mov
        "video/webm",
    )

    # --- Background processing (Celery + Redis). Sprint 1.3. ---
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    job_max_retries: int = Field(default=2, alias="JOB_MAX_RETRIES")
    job_retry_countdown_seconds: int = Field(default=5, alias="JOB_RETRY_COUNTDOWN_SECONDS")
    job_lock_ttl_seconds: int = Field(default=900, alias="JOB_LOCK_TTL_SECONDS")
    job_progress_ttl_seconds: int = Field(default=3600, alias="JOB_PROGRESS_TTL_SECONDS")
    job_stage_duration_seconds: float = Field(default=1.0, alias="JOB_STAGE_DURATION_SECONDS")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
