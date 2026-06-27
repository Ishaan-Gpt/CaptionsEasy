import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UsageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    uploads_used: int
    renders_used: int
    ai_tokens_used: int
    storage_used: int
    created_at: datetime
    updated_at: datetime


class UsageUpdate(BaseModel):
    uploads_used: int | None = None
    renders_used: int | None = None
    ai_tokens_used: int | None = None
    storage_used: int | None = None
