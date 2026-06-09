import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CategoryFormat, Gender


class CategoryCreate(BaseModel):
    name: str
    gender: Gender
    format: CategoryFormat


class CategoryUpdate(BaseModel):
    name: str | None = None
    gender: Gender | None = None
    format: CategoryFormat | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    gender: Gender
    format: CategoryFormat
    created_at: datetime
    updated_at: datetime
