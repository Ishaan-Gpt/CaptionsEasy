import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CreativePlanBase(BaseModel):
    # Contains: pacing, emotion, speaking_style, energy_curve, key_moments.
    creative_plan: dict[str, Any]


class CreativePlanCreate(CreativePlanBase):
    project_id: uuid.UUID


class CreativePlanRead(CreativePlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
