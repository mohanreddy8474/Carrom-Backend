import uuid

from sqlalchemy.orm import Session

from app.models.enums import MatchStatus, ParticipantType
from app.models.group import Group
from app.models.match import Match
from app.utils.participants import normalize_pair


def _existing_pairs(db: Session, group_id: uuid.UUID) -> set[tuple[uuid.UUID, uuid.UUID]]:
    matches = db.query(Match).filter(Match.group_id == group_id).all()
    return {
        normalize_pair(m.participant1_id, m.participant2_id) for m in matches
    }


def generate_missing_fixtures(
    db: Session,
    group: Group,
    new_participant_id: uuid.UUID,
    participant_type: ParticipantType,
    existing_participant_ids: list[uuid.UUID],
) -> list[Match]:
    """Create matches only for pairings that do not already exist."""
    existing = _existing_pairs(db, group.id)
    created: list[Match] = []

    for other_id in existing_participant_ids:
        if other_id == new_participant_id:
            continue
        pair = normalize_pair(new_participant_id, other_id)
        if pair in existing:
            continue
        match = Match(
            category_id=group.category_id,
            group_id=group.id,
            participant1_id=pair[0],
            participant2_id=pair[1],
            participant_type=participant_type,
            status=MatchStatus.SCHEDULED,
        )
        db.add(match)
        created.append(match)
        existing.add(pair)

    return created


def delete_scheduled_matches_for_participant(
    db: Session,
    group_id: uuid.UUID,
    participant_id: uuid.UUID,
) -> int:
    """Delete only SCHEDULED matches involving the given participant."""
    matches = (
        db.query(Match)
        .filter(
            Match.group_id == group_id,
            Match.status == MatchStatus.SCHEDULED,
            (
                (Match.participant1_id == participant_id)
                | (Match.participant2_id == participant_id)
            ),
        )
        .all()
    )
    count = len(matches)
    for match in matches:
        db.delete(match)
    return count
