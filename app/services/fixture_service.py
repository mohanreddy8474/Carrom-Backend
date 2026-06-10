import uuid

from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryFormat, Gender, MatchStatus, ParticipantType
from app.models.group import Group
from app.models.match import Match
from app.utils.participants import normalize_pair


def matches_per_pair_for_category(category: Category) -> int:
    """Women's singles groups play each opponent twice; all others play once."""
    if (
        category.format == CategoryFormat.SINGLES
        and category.gender == Gender.FEMALE
    ):
        return 2
    return 1


def _pair_match_counts(
    db: Session, group_id: uuid.UUID
) -> dict[tuple[uuid.UUID, uuid.UUID], int]:
    matches = db.query(Match).filter(Match.group_id == group_id).all()
    counts: dict[tuple[uuid.UUID, uuid.UUID], int] = {}
    for match in matches:
        pair = normalize_pair(match.participant1_id, match.participant2_id)
        counts[pair] = counts.get(pair, 0) + 1
    return counts


def generate_missing_fixtures(
    db: Session,
    group: Group,
    new_participant_id: uuid.UUID,
    participant_type: ParticipantType,
    existing_participant_ids: list[uuid.UUID],
    matches_per_pair: int = 1,
) -> list[Match]:
    """Create scheduled matches until each pairing reaches matches_per_pair."""
    pair_counts = _pair_match_counts(db, group.id)
    created: list[Match] = []

    for other_id in existing_participant_ids:
        if other_id == new_participant_id:
            continue
        pair = normalize_pair(new_participant_id, other_id)
        while pair_counts.get(pair, 0) < matches_per_pair:
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
            pair_counts[pair] = pair_counts.get(pair, 0) + 1

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
