import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    title: str
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    # TODO(database.md): status has no enumerated values in the contract.
    status: str | None = None
    thumbnail_url: str | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    status: str | None = None
    thumbnail_url: str | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
