import uuid

from sqlalchemy.orm import Session

from app.models.enums import ParticipantType
from app.models.match import Match
from app.models.player import Player
from app.models.team import Team
from app.schemas.match import MatchResponse


def resolve_participant_name(
    db: Session, participant_id: uuid.UUID, participant_type: ParticipantType
) -> str:
    if participant_type == ParticipantType.PLAYER:
        player = db.query(Player).filter(Player.id == participant_id).first()
        return player.name if player else "Unknown Player"
    team = db.query(Team).filter(Team.id == participant_id).first()
    return team.team_name if team else "Unknown Team"


def enrich_match(db: Session, match: Match) -> MatchResponse:
    data = MatchResponse.model_validate(match)
    data.participant1_name = resolve_participant_name(
        db, match.participant1_id, match.participant_type
    )
    data.participant2_name = resolve_participant_name(
        db, match.participant2_id, match.participant_type
    )
    return data
