import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.enums import MatchStatus
from app.models.match import Match
from app.schemas.match import MatchResponse, MatchUpdate
from app.services import match_service
from app.utils.match_names import enrich_match

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchResponse])
def list_matches(
    group_id: uuid.UUID | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    status: MatchStatus | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Match)
    if group_id is not None:
        query = query.filter(Match.group_id == group_id)
    if category_id is not None:
        query = query.filter(Match.category_id == category_id)
    if status is not None:
        query = query.filter(Match.status == status)
    matches = query.order_by(Match.created_at).all()
    return [enrich_match(db, m) for m in matches]


@router.patch("/{match_id}", response_model=MatchResponse, dependencies=[Depends(verify_admin_key)])
def update_match(match_id: uuid.UUID, data: MatchUpdate, db: Session = Depends(get_db)):
    match = match_service.update_match(db, match_id, data)
    return enrich_match(db, match)
