import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GroupPlayerCreate(BaseModel):
    player_id: uuid.UUID
    group_position: int | None = None


class GroupPlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    player_id: uuid.UUID
    group_position: int | None
    created_at: datetime
