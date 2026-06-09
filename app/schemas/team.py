import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    team_name: str
    player1_id: uuid.UUID
    player2_id: uuid.UUID
    category_id: uuid.UUID


class TeamUpdate(BaseModel):
    team_name: str | None = None
    player1_id: uuid.UUID | None = None
    player2_id: uuid.UUID | None = None
    is_active: bool | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_name: str
    player1_id: uuid.UUID
    player2_id: uuid.UUID
    category_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
