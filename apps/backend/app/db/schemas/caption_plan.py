import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CaptionPlanBase(BaseModel):
    caption_json: dict[str, Any]


class CaptionPlanCreate(CaptionPlanBase):
    project_id: uuid.UUID


class CaptionPlanRead(CaptionPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
