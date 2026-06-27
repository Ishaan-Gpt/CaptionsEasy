import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class TranscriptBase(BaseModel):
    language: str | None = None
    provider: str | None = None
    version: int | None = None
    transcript_json: dict[str, Any]


class TranscriptCreate(TranscriptBase):
    project_id: uuid.UUID


class TranscriptRead(TranscriptBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
