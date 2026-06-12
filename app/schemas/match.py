import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import MatchStatus, ParticipantType


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    group_id: uuid.UUID
    participant1_id: uuid.UUID
    participant2_id: uuid.UUID
    participant_type: ParticipantType
    status: MatchStatus
    winner_participant_id: uuid.UUID | None
    winner_score: int | None
    loser_score: int | None
    created_at: datetime
    updated_at: datetime
    participant1_name: str | None = None
    participant2_name: str | None = None


class MatchUpdate(BaseModel):
    status: MatchStatus | None = None
    winner_participant_id: uuid.UUID | None = None
    winner_score: int | None = None
    loser_score: int | None = None
