import argparse

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Category, Group, GroupPlayer, GroupTeam, Match, Player, Team
from app.models.enums import CategoryFormat, Gender, MatchStatus, ParticipantType
from app.services import fixture_service


def clear_all(db: Session) -> None:
    db.query(Match).delete()
    db.query(GroupPlayer).delete()
    db.query(GroupTeam).delete()
    db.query(Group).delete()
    db.query(Team).delete()
    db.query(Player).delete()
    db.query(Category).delete()
    db.commit()


def _add_player(db: Session, group: Group, player_id, position: int) -> GroupPlayer:
    other_ids = [
        gp.player_id
        for gp in db.query(GroupPlayer).filter(GroupPlayer.group_id == group.id).all()
    ]
    assignment = GroupPlayer(
        group_id=group.id, player_id=player_id, group_position=position
    )
    db.add(assignment)
    db.flush()
    fixture_service.generate_missing_fixtures(
        db, group, player_id, ParticipantType.PLAYER, other_ids
    )
    return assignment


def _add_team(db: Session, group: Group, team_id, position: int) -> GroupTeam:
    other_ids = [
        gt.team_id
        for gt in db.query(GroupTeam).filter(GroupTeam.group_id == group.id).all()
    ]
    assignment = GroupTeam(group_id=group.id, team_id=team_id, group_position=position)
    db.add(assignment)
    db.flush()
    fixture_service.generate_missing_fixtures(
        db, group, team_id, ParticipantType.TEAM, other_ids
    )
    return assignment


def _complete_match(db: Session, match: Match, winner_id, winner_score: int) -> None:
    match.status = MatchStatus.COMPLETED
    match.winner_participant_id = winner_id
    match.winner_score = winner_score


def seed(db: Session) -> dict[str, int]:
    categories = {
        "ms": Category(
            name="Men's Singles", gender=Gender.MALE, format=CategoryFormat.SINGLES
        ),
        "ws": Category(
            name="Women's Singles", gender=Gender.FEMALE, format=CategoryFormat.SINGLES
        ),
        "md": Category(
            name="Men's Doubles", gender=Gender.MALE, format=CategoryFormat.DOUBLES
        ),
        "wd": Category(
            name="Women's Doubles", gender=Gender.FEMALE, format=CategoryFormat.DOUBLES
        ),
        "xd": Category(
            name="Mixed Doubles", gender=Gender.MIXED, format=CategoryFormat.DOUBLES
        ),
    }
    db.add_all(categories.values())
    db.flush()

    players_data = [
        ("Mohan", "EMP001", Gender.MALE),
        ("Rahul", "EMP002", Gender.MALE),
        ("Ajay", "EMP003", Gender.MALE),
        ("Kiran", "EMP004", Gender.MALE),
        ("Vikram", "EMP005", Gender.MALE),
        ("Arjun", "EMP006", Gender.MALE),
        ("Priya", "EMP007", Gender.FEMALE),
        ("Ananya", "EMP008", Gender.FEMALE),
        ("Neha", "EMP009", Gender.FEMALE),
        ("Divya", "EMP010", Gender.FEMALE),
        ("Meera", "EMP011", Gender.FEMALE),
    ]
    players: dict[str, Player] = {}
    for name, employee_id, gender in players_data:
        player = Player(name=name, employee_id=employee_id, gender=gender)
        db.add(player)
        players[name] = player
    db.flush()

    groups = {
        "ms_a": Group(category_id=categories["ms"].id, name="Group A"),
        "ms_b": Group(category_id=categories["ms"].id, name="Group B"),
        "ws_a": Group(category_id=categories["ws"].id, name="Group A"),
        "ws_b": Group(category_id=categories["ws"].id, name="Group B"),
        "md_a": Group(category_id=categories["md"].id, name="Group A"),
        "wd_a": Group(category_id=categories["wd"].id, name="Group A"),
        "xd_a": Group(category_id=categories["xd"].id, name="Group A"),
    }
    db.add_all(groups.values())
    db.flush()

    teams_data = [
        ("Mohan", "Rahul", "md"),
        ("Ajay", "Kiran", "md"),
        ("Vikram", "Arjun", "md"),
        ("Priya", "Ananya", "wd"),
        ("Neha", "Divya", "wd"),
        ("Mohan", "Priya", "xd"),
        ("Rahul", "Ananya", "xd"),
    ]
    teams: dict[str, Team] = {}
    for p1, p2, cat_key in teams_data:
        team = Team(
            team_name=f"{p1} / {p2}",
            player1_id=players[p1].id,
            player2_id=players[p2].id,
            category_id=categories[cat_key].id,
        )
        db.add(team)
        teams[f"{p1}/{p2}"] = team
    db.flush()

    for group, names in [
        (groups["ms_a"], ["Mohan", "Rahul", "Ajay"]),
        (groups["ms_b"], ["Kiran", "Vikram", "Arjun"]),
        (groups["ws_a"], ["Priya", "Ananya", "Neha"]),
        (groups["ws_b"], ["Divya", "Meera"]),
    ]:
        for position, name in enumerate(names, start=1):
            _add_player(db, group, players[name].id, position)

    for group, team_keys in [
        (groups["md_a"], ["Mohan/Rahul", "Ajay/Kiran", "Vikram/Arjun"]),
        (groups["wd_a"], ["Priya/Ananya", "Neha/Divya"]),
        (groups["xd_a"], ["Mohan/Priya", "Rahul/Ananya"]),
    ]:
        for position, team_key in enumerate(team_keys, start=1):
            _add_team(db, group, teams[team_key].id, position)

    db.flush()

    ms_a_matches = (
        db.query(Match)
        .filter(Match.group_id == groups["ms_a"].id)
        .order_by(Match.created_at)
        .all()
    )
    if len(ms_a_matches) >= 3:
        _complete_match(db, ms_a_matches[0], players["Mohan"].id, 29)
        _complete_match(db, ms_a_matches[1], players["Rahul"].id, 25)
        ms_a_matches[2].status = MatchStatus.LIVE

    ws_a_matches = (
        db.query(Match)
        .filter(Match.group_id == groups["ws_a"].id)
        .order_by(Match.created_at)
        .all()
    )
    if ws_a_matches:
        _complete_match(db, ws_a_matches[0], players["Priya"].id, 27)

    md_a_matches = (
        db.query(Match)
        .filter(Match.group_id == groups["md_a"].id)
        .order_by(Match.created_at)
        .all()
    )
    if md_a_matches:
        _complete_match(db, md_a_matches[0], teams["Mohan/Rahul"].id, 31)

    db.commit()

    return {
        "categories": db.query(Category).count(),
        "groups": db.query(Group).count(),
        "players": db.query(Player).count(),
        "teams": db.query(Team).count(),
        "group_players": db.query(GroupPlayer).count(),
        "group_teams": db.query(GroupTeam).count(),
        "matches": db.query(Match).count(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the database with sample data")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Clear existing data before seeding",
    )
    args = parser.parse_args()

    if args.force:
        print("Dropping and recreating tables...")
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        has_data = db.query(Category).count() > 0
        if has_data and not args.force:
            print("Database already has data. Run with --force to clear and reseed.")
            return

        print("Seeding sample data...")
        counts = seed(db)
        print("Done! Seeded:")
        for table, count in counts.items():
            print(f"  {table}: {count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
