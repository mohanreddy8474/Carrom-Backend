from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.schemas.admin import AdminVerifyRequest, AdminVerifyResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/verify", response_model=AdminVerifyResponse)
def verify_admin(data: AdminVerifyRequest):
    if data.secret_key != settings.admin_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin secret",
        )
    return AdminVerifyResponse(valid=True)
