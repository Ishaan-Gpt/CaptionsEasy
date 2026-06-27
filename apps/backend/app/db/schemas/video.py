import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VideoBase(BaseModel):
    storage_path: str
    duration_ms: int | None = None
    width: int | None = None
    height: int | None = None
    fps: int | None = None
    codec: str | None = None
    file_size: int | None = None


class VideoCreate(VideoBase):
    project_id: uuid.UUID


class VideoRead(VideoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    uploaded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
