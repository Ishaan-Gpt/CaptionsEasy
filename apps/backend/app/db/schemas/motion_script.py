import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class MotionScriptBase(BaseModel):
    motion_script_json: dict[str, Any]
    version: int | None = None


class MotionScriptCreate(MotionScriptBase):
    project_id: uuid.UUID


class MotionScriptRead(MotionScriptBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
