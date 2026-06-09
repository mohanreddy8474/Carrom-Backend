import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.player import Player
from app.schemas.player import PlayerCreate, PlayerResponse, PlayerUpdate

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=list[PlayerResponse])
def list_players(db: Session = Depends(get_db)):
    return db.query(Player).order_by(Player.name).all()


@router.post("", response_model=PlayerResponse, dependencies=[Depends(verify_admin_key)])
def create_player(data: PlayerCreate, db: Session = Depends(get_db)):
    player = Player(
        name=data.name,
        employee_id=data.employee_id,
        gender=data.gender,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.put("/{player_id}", response_model=PlayerResponse, dependencies=[Depends(verify_admin_key)])
def update_player(player_id: uuid.UUID, data: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if data.name is not None:
        player.name = data.name
    if data.employee_id is not None:
        player.employee_id = data.employee_id
    if data.gender is not None:
        player.gender = data.gender
    if data.is_active is not None:
        player.is_active = data.is_active
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", response_model=PlayerResponse, dependencies=[Depends(verify_admin_key)])
def delete_player(player_id: uuid.UUID, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    player.is_active = False
    db.commit()
    db.refresh(player)
    return player
