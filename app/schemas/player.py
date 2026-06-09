import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import Gender


class PlayerCreate(BaseModel):
    name: str
    employee_id: str | None = None
    gender: Gender


class PlayerUpdate(BaseModel):
    name: str | None = None
    employee_id: str | None = None
    gender: Gender | None = None
    is_active: bool | None = None


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    employee_id: str | None
    gender: Gender
    is_active: bool
    created_at: datetime
    updated_at: datetime
