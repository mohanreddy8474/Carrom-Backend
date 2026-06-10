from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.core.config import settings
from app.db.seed import clear_all, seed
from app.db.tournament_seed import seed_tournament
from app.db.session import get_db
from app.models.category import Category
from app.schemas.admin import (
    AdminVerifyRequest,
    AdminVerifyResponse,
    SeedTestDataResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/verify", response_model=AdminVerifyResponse)
def verify_admin(data: AdminVerifyRequest):
    if data.secret_key != settings.admin_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin secret",
        )
    return AdminVerifyResponse(valid=True)


@router.post(
    "/seed-test-data",
    response_model=SeedTestDataResponse,
    dependencies=[Depends(verify_admin_key)],
)
def seed_test_data(
    force: bool = Query(
        False,
        description="Clear existing tournament data and reseed",
    ),
    db: Session = Depends(get_db),
):
    has_data = db.query(Category).count() > 0
    if has_data and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database already has data. Pass ?force=true to clear and reseed.",
        )

    if has_data and force:
        clear_all(db)

    counts = seed(db)
    return SeedTestDataResponse(
        message="Test tournament data loaded successfully.",
        counts=counts,
    )


@router.post(
    "/seed-tournament-data",
    response_model=SeedTestDataResponse,
    dependencies=[Depends(verify_admin_key)],
)
def seed_tournament_data(
    force: bool = Query(
        False,
        description="Clear existing tournament data and reseed",
    ),
    db: Session = Depends(get_db),
):
    has_data = db.query(Category).count() > 0
    if has_data and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database already has data. Pass ?force=true to clear and reseed.",
        )

    if has_data and force:
        clear_all(db)

    counts = seed_tournament(db)
    return SeedTestDataResponse(
        message="Tournament data loaded successfully.",
        counts=counts,
    )
