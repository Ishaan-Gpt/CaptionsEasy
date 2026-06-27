import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileBase(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


class ProfileCreate(ProfileBase):
    auth_user_id: uuid.UUID


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


class ProfileRead(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
