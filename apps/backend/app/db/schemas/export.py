import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExportBase(BaseModel):
    # TODO(database.md): resolution/quality have no enumerated values
    # in the contract.
    resolution: str | None = None
    quality: str | None = None


class ExportCreate(ExportBase):
    project_id: uuid.UUID


class ExportRead(ExportBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    storage_path: str | None = None
    render_duration_ms: int | None = None
    created_at: datetime
    updated_at: datetime
