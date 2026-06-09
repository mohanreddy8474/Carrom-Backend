import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GroupTeamCreate(BaseModel):
    team_id: uuid.UUID
    group_position: int | None = None


class GroupTeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    team_id: uuid.UUID
    group_position: int | None
    created_at: datetime
