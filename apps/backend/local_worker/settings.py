"""Local worker's own settings — deliberately a small subset of
app.core.config.Settings' fields (just what the Groq providers +
RenderEngine actually read via attribute access; Python is duck-typed, so
passing this wherever `Settings` is type-hinted works fine). No
DATABASE_URL/SUPABASE_* fields exist here on purpose — the local worker
never holds DB or Storage credentials.
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LocalWorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- This worker's own identity ---
    smoothcaptions_app_url: str = Field(
        default="https://captionseasy.vercel.app", alias="CAPTIONSEASY_APP_URL"
    )
    backend_api_url: str = Field(
        default="https://motionai-backend.onrender.com/api/v1", alias="CAPTIONSEASY_API_URL"
    )
    worker_name: str = Field(default="My Computer", alias="WORKER_NAME")
    port: int = Field(default=0, alias="PORT")  # 0 = OS picks a free port

    # --- Groq AI (same field names/aliases as the backend's Settings) ---
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    groq_api_key_backup: Optional[str] = Field(default=None, alias="GROQ_API_KEY_BACKUP")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    groq_speech_model: str = Field(default="whisper-large-v3", alias="GROQ_SPEECH_MODEL")
    groq_timeout_seconds: float = Field(default=120.0, alias="GROQ_TIMEOUT_SECONDS")
    groq_cost_per_second_usd: float = Field(default=0.0001, alias="GROQ_COST_PER_SECOND_USD")
    groq_creative_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_CREATIVE_MODEL")
    groq_caption_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_CAPTION_MODEL")
    groq_creative_cost_input_usd: float = Field(default=0.59 / 1_000_000.0, alias="GROQ_CREATIVE_COST_INPUT_USD")
    groq_creative_cost_output_usd: float = Field(default=0.79 / 1_000_000.0, alias="GROQ_CREATIVE_COST_OUTPUT_USD")
    groq_caption_cost_input_usd: float = Field(default=0.59 / 1_000_000.0, alias="GROQ_CAPTION_COST_INPUT_USD")
    groq_caption_cost_output_usd: float = Field(default=0.79 / 1_000_000.0, alias="GROQ_CAPTION_COST_OUTPUT_USD")

    # --- Render ---
    ffmpeg_binary: str = Field(default="ffmpeg", alias="FFMPEG_BINARY")
    ffprobe_binary: str = Field(default="ffprobe", alias="FFPROBE_BINARY")
    use_remotion_render: bool = Field(default=True, alias="USE_REMOTION_RENDER")


@lru_cache
def get_local_worker_settings() -> LocalWorkerSettings:
    return LocalWorkerSettings()  # type: ignore[call-arg]
