import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.category import Category
from app.models.enums import CategoryFormat, Gender
from app.models.group import Group
from app.models.player import Player
from app.models.team import Team
from app.schemas.group_team import GroupTeamCreate
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate
from app.services import group_service

router = APIRouter(prefix="/teams", tags=["teams"])


def _validate_doubles_players(
    db: Session, category: Category, player1_id: uuid.UUID, player2_id: uuid.UUID
) -> tuple[Player, Player]:
    if player1_id == player2_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team cannot have the same player twice",
        )

    players: list[Player] = []
    for pid in (player1_id, player2_id):
        player = db.query(Player).filter(Player.id == pid).first()
        if not player:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Player {pid} not found"
            )
        if not player.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Player {pid} is not active",
            )
        players.append(player)

    p1, p2 = players
    if category.gender == Gender.MALE:
        if p1.gender != Gender.MALE or p2.gender != Gender.MALE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Men's Doubles teams must have two male players",
            )
    elif category.gender == Gender.FEMALE:
        if p1.gender != Gender.FEMALE or p2.gender != Gender.FEMALE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Women's Doubles teams must have two female players",
            )
    elif category.gender == Gender.MIXED:
        if p1.gender == p2.gender:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mixed Doubles teams must have one male and one female player",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category for doubles team",
        )

    return p1, p2


def _ensure_players_not_on_team(
    db: Session, category_id: uuid.UUID, player1_id: uuid.UUID, player2_id: uuid.UUID
) -> None:
    existing_teams = (
        db.query(Team)
        .filter(Team.category_id == category_id, Team.is_active.is_(True))
        .all()
    )
    for team in existing_teams:
        assigned = {team.player1_id, team.player2_id}
        for pid in (player1_id, player2_id):
            if pid in assigned:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or both players are already on a team in this category",
                )


@router.get("", response_model=list[TeamResponse])
def list_teams(
    category_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Team)
    if category_id is not None:
        query = query.filter(Team.category_id == category_id)
    return query.order_by(Team.created_at).all()


@router.post("", response_model=TeamResponse, dependencies=[Depends(verify_admin_key)])
def create_team(data: TeamCreate, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if category.format != CategoryFormat.DOUBLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams can only be created for doubles categories",
        )

    group = db.query(Group).filter(Group.id == data.group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if group.category_id != data.category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group does not belong to the selected category",
        )

    p1, p2 = _validate_doubles_players(db, category, data.player1_id, data.player2_id)
    _ensure_players_not_on_team(db, data.category_id, data.player1_id, data.player2_id)

    team = Team(
        team_name=f"{p1.name} / {p2.name}",
        player1_id=data.player1_id,
        player2_id=data.player2_id,
        category_id=data.category_id,
    )
    db.add(team)
    db.flush()

    group_service.add_team(db, data.group_id, GroupTeamCreate(team_id=team.id))
    db.refresh(team)
    return team


@router.put("/{team_id}", response_model=TeamResponse, dependencies=[Depends(verify_admin_key)])
def update_team(team_id: uuid.UUID, data: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    category = db.query(Category).filter(Category.id == team.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if data.player1_id is not None or data.player2_id is not None:
        p1_id = data.player1_id if data.player1_id is not None else team.player1_id
        p2_id = data.player2_id if data.player2_id is not None else team.player2_id
        p1, p2 = _validate_doubles_players(db, category, p1_id, p2_id)
        team.player1_id = p1.id
        team.player2_id = p2.id
        team.team_name = f"{p1.name} / {p2.name}"

    if data.is_active is not None:
        team.is_active = data.is_active

    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", response_model=TeamResponse, dependencies=[Depends(verify_admin_key)])
def delete_team(team_id: uuid.UUID, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    team.is_active = False
    db.commit()
    db.refresh(team)
    return team
