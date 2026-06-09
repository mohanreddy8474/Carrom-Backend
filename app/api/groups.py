import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.category import Category
from app.models.group import Group
from app.models.group_player import GroupPlayer
from app.models.group_team import GroupTeam
from app.models.match import Match
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate
from app.schemas.group_player import GroupPlayerCreate, GroupPlayerResponse
from app.schemas.group_team import GroupTeamCreate, GroupTeamResponse
from app.schemas.match import MatchResponse
from app.schemas.standings import StandingEntry
from app.services import group_service, standings_service
from app.utils.match_names import enrich_match

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupResponse])
def list_groups(
    category_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Group)
    if category_id is not None:
        query = query.filter(Group.category_id == category_id)
    return query.order_by(Group.name).all()


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: uuid.UUID, db: Session = Depends(get_db)):
    return group_service.get_group(db, group_id)


@router.post("", response_model=GroupResponse, dependencies=[Depends(verify_admin_key)])
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    group = Group(category_id=data.category_id, name=data.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.put("/{group_id}", response_model=GroupResponse, dependencies=[Depends(verify_admin_key)])
def update_group(group_id: uuid.UUID, data: GroupUpdate, db: Session = Depends(get_db)):
    group = group_service.get_group(db, group_id)
    group.name = data.name
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_admin_key)])
def delete_group(group_id: uuid.UUID, db: Session = Depends(get_db)):
    group = group_service.get_group(db, group_id)
    db.delete(group)
    db.commit()


@router.get("/{group_id}/players", response_model=list[GroupPlayerResponse])
def list_group_players(group_id: uuid.UUID, db: Session = Depends(get_db)):
    group_service.get_group(db, group_id)
    return (
        db.query(GroupPlayer)
        .filter(GroupPlayer.group_id == group_id)
        .order_by(GroupPlayer.group_position.nulls_last(), GroupPlayer.created_at)
        .all()
    )


@router.post(
    "/{group_id}/players",
    response_model=GroupPlayerResponse,
    dependencies=[Depends(verify_admin_key)],
)
def add_group_player(
    group_id: uuid.UUID, data: GroupPlayerCreate, db: Session = Depends(get_db)
):
    return group_service.add_player(db, group_id, data)


@router.delete(
    "/{group_id}/players/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_key)],
)
def remove_group_player(
    group_id: uuid.UUID, assignment_id: uuid.UUID, db: Session = Depends(get_db)
):
    group_service.remove_player(db, group_id, assignment_id)


@router.get("/{group_id}/teams", response_model=list[GroupTeamResponse])
def list_group_teams(group_id: uuid.UUID, db: Session = Depends(get_db)):
    group_service.get_group(db, group_id)
    return (
        db.query(GroupTeam)
        .filter(GroupTeam.group_id == group_id)
        .order_by(GroupTeam.group_position.nulls_last(), GroupTeam.created_at)
        .all()
    )


@router.post(
    "/{group_id}/teams",
    response_model=GroupTeamResponse,
    dependencies=[Depends(verify_admin_key)],
)
def add_group_team(
    group_id: uuid.UUID, data: GroupTeamCreate, db: Session = Depends(get_db)
):
    return group_service.add_team(db, group_id, data)


@router.delete(
    "/{group_id}/teams/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_key)],
)
def remove_group_team(
    group_id: uuid.UUID, assignment_id: uuid.UUID, db: Session = Depends(get_db)
):
    group_service.remove_team(db, group_id, assignment_id)


@router.get("/{group_id}/matches", response_model=list[MatchResponse])
def list_group_matches(group_id: uuid.UUID, db: Session = Depends(get_db)):
    group_service.get_group(db, group_id)
    matches = (
        db.query(Match)
        .filter(Match.group_id == group_id)
        .order_by(Match.created_at)
        .all()
    )
    return [enrich_match(db, m) for m in matches]


@router.get("/{group_id}/standings", response_model=list[StandingEntry])
def get_group_standings(group_id: uuid.UUID, db: Session = Depends(get_db)):
    group_service.get_group(db, group_id)
    return standings_service.calculate_standings(db, group_id)
