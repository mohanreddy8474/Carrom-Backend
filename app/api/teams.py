import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.category import Category
from app.models.enums import CategoryFormat
from app.models.player import Player
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamResponse])
def list_teams(
    category_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Team)
    if category_id is not None:
        query = query.filter(Team.category_id == category_id)
    return query.order_by(Team.team_name).all()


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

    for pid in (data.player1_id, data.player2_id):
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

    if data.player1_id == data.player2_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team cannot have the same player twice",
        )

    team = Team(
        team_name=data.team_name,
        player1_id=data.player1_id,
        player2_id=data.player2_id,
        category_id=data.category_id,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.put("/{team_id}", response_model=TeamResponse, dependencies=[Depends(verify_admin_key)])
def update_team(team_id: uuid.UUID, data: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if data.player1_id is not None or data.player2_id is not None:
        p1 = data.player1_id if data.player1_id is not None else team.player1_id
        p2 = data.player2_id if data.player2_id is not None else team.player2_id
        if p1 == p2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A team cannot have the same player twice",
            )
        for pid in (p1, p2):
            player = db.query(Player).filter(Player.id == pid).first()
            if not player or not player.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Player {pid} is not valid or active",
                )
        team.player1_id = p1
        team.player2_id = p2

    if data.team_name is not None:
        team.team_name = data.team_name
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
