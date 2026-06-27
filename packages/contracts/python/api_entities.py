"""JobStatus / ApiError / User / Project / Video / Export Pydantic models. Source: contracts/json-schemas.md"""

import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JobStatusValue(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ApiError(StrictModel):
    code: str
    message: str
    details: dict | None = None
    retryable: bool
    timestamp: datetime


class JobStatus(StrictModel):
    id: str
    stage: str
    progress: int = Field(ge=0, le=100)
    status: JobStatusValue
    estimated_remaining_ms: int | None = Field(default=None, ge=0)
    error: ApiError | None = None


class User(StrictModel):
    id: str
    email: EmailStr
    name: str | None = None
    avatar: str | None = None


class Project(StrictModel):
    id: str
    title: str
    # TODO(database.md): no enumerated status values defined in the contracts.
    status: str | None = None
    thumbnail: str | None = None
    created_at: datetime
    updated_at: datetime


class Video(StrictModel):
    id: str
    duration_ms: int | None = Field(default=None, ge=0)
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    fps: float | None = Field(default=None, gt=0)
    codec: str | None = None
    storage_path: str


class Export(StrictModel):
    id: str
    # TODO(database.md): no enumerated resolution values defined in the contracts.
    resolution: str | None = None
    # TODO(database.md): no enumerated quality values defined in the contracts.
    quality: str | None = None
    download_url: str | None = None
    render_time_ms: int | None = Field(default=None, ge=0)
    file_size: int | None = Field(default=None, ge=0)
