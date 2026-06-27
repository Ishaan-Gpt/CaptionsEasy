import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.enums import JobStatus


class JobBase(BaseModel):
    # TODO(database.md): job_type has no enumerated values in the contract.
    job_type: str


class JobCreate(JobBase):
    project_id: uuid.UUID


class JobUpdate(BaseModel):
    status: JobStatus | None = None
    progress: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_message: str | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: JobStatus
    progress: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
