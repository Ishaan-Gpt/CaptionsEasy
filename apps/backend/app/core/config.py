"""Application configuration. Source: ai-context/SHARED_CONTEXT.md (no secrets in code)

Every setting is read from the environment. Nothing is hardcoded.
"""

from typing import List, Tuple, Optional
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    environment: str = Field(default="development", alias="ENVIRONMENT")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    cors_allow_origins: List[str] = Field(default_factory=list, alias="CORS_ALLOW_ORIGINS")

    # --- Database (SQLAlchemy async engine; Alembic uses its own DATABASE_URL — see alembic/env.py) ---
    database_url: str = Field(..., alias="DATABASE_URL_ASYNC")

    # --- Auth (Supabase) ---
    # Legacy projects sign access tokens with this shared secret (HS256).
    # Newer projects use asymmetric "JWT Signing Keys" (e.g. ES256) instead —
    # those are verified via supabase_url's JWKS endpoint, not this secret.
    # See app.auth.jwt.decode_supabase_jwt, which tries both.
    supabase_jwt_secret: str = Field(..., alias="SUPABASE_JWT_SECRET")
    supabase_jwt_algorithm: str = Field(default="HS256", alias="SUPABASE_JWT_ALGORITHM")

    # --- Storage (Supabase Storage) ---
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_storage_bucket: str = Field(default="videos", alias="SUPABASE_STORAGE_BUCKET")

    # --- Upload limits (docs/PRD.md > Upload) ---
    max_upload_size_bytes: int = Field(default=500 * 1024 * 1024, alias="MAX_UPLOAD_SIZE_BYTES")
    allowed_upload_content_types: Tuple[str, ...] = (
        "video/mp4",
        "video/quicktime",  # .mov
        "video/webm",
    )

    # --- Background processing (Celery + Redis). Sprint 1.3. ---
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    # When true, Celery executes tasks synchronously in the calling process
    # instead of publishing to a broker — lets local dev skip running Redis
    # and a separate worker process entirely (job_dispatcher.dispatch()
    # blocks until the whole pipeline finishes, in the same request).
    celery_task_always_eager: bool = Field(default=False, alias="CELERY_TASK_ALWAYS_EAGER")
    # When true, the web process also runs the Celery worker loop in a
    # background thread instead of relying on a separate worker service.
    # Render's free tier has no Background Worker service type at all, so
    # this is the only free way to process jobs there — see DEPLOYMENT.md.
    run_worker_inline: bool = Field(default=False, alias="RUN_WORKER_INLINE")
    job_max_retries: int = Field(default=2, alias="JOB_MAX_RETRIES")
    job_retry_countdown_seconds: int = Field(default=5, alias="JOB_RETRY_COUNTDOWN_SECONDS")
    job_lock_ttl_seconds: int = Field(default=900, alias="JOB_LOCK_TTL_SECONDS")
    job_progress_ttl_seconds: int = Field(default=3600, alias="JOB_PROGRESS_TTL_SECONDS")
    job_stage_duration_seconds: float = Field(default=1.0, alias="JOB_STAGE_DURATION_SECONDS")

    # --- AI provider selection (contracts/ai.md > Providers). Sprint 1.4. ---
    # "Provider selection must come from configuration" — every stage's
    # provider name resolves through app.ai.providers.stage_provider_registry.
    # Only "dummy" providers exist so far (no real AI calls this sprint).
    speech_provider_name: str = Field(default="dummy", alias="SPEECH_PROVIDER_NAME")
    creative_provider_name: str = Field(default="dummy", alias="CREATIVE_PROVIDER_NAME")
    caption_provider_name: str = Field(default="dummy", alias="CAPTION_PROVIDER_NAME")
    render_plan_provider_name: str = Field(default="dummy", alias="RENDER_PLAN_PROVIDER_NAME")
    use_remotion_render: bool = Field(default=True, alias="USE_REMOTION_RENDER")

    # --- Groq AI (speech provider). Sprint 1.5/1.6. ---
    # Groq exposes an OpenAI-Whisper-compatible transcription endpoint.
    # Never hardcoded outside app.ai.providers.speech — these are the only
    # vendor-specific knobs, and SPEECH_PROVIDER_NAME stays the single
    # switch that decides whether this vendor is even used.
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    groq_api_key_backup: Optional[str] = Field(default=None, alias="GROQ_API_KEY_BACKUP")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    groq_speech_model: str = Field(default="whisper-large-v3", alias="GROQ_SPEECH_MODEL")
    groq_timeout_seconds: float = Field(default=120.0, alias="GROQ_TIMEOUT_SECONDS")
    groq_cost_per_second_usd: float = Field(default=0.0001, alias="GROQ_COST_PER_SECOND_USD")
    groq_creative_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_CREATIVE_MODEL")
    groq_caption_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_CAPTION_MODEL")
    groq_creative_cost_input_usd: float = Field(default=0.59 / 1000000.0, alias="GROQ_CREATIVE_COST_INPUT_USD")
    groq_creative_cost_output_usd: float = Field(default=0.79 / 1000000.0, alias="GROQ_CREATIVE_COST_OUTPUT_USD")
    groq_caption_cost_input_usd: float = Field(default=0.59 / 1000000.0, alias="GROQ_CAPTION_COST_INPUT_USD")
    groq_caption_cost_output_usd: float = Field(default=0.79 / 1000000.0, alias="GROQ_CAPTION_COST_OUTPUT_USD")



@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
