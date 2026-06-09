import uuid

from pydantic import BaseModel

from app.models.enums import ParticipantType


class StandingEntry(BaseModel):
    participant_id: uuid.UUID
    participant_type: ParticipantType
    display_name: str
    matches_played: int
    wins: int
    losses: int
    tournament_points: int
    score: int
