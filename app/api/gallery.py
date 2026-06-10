import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.gallery_image import GalleryImage
from app.schemas.gallery import GalleryImageResponse, gallery_image_to_response

router = APIRouter(prefix="/gallery", tags=["gallery"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024


@router.get("", response_model=list[GalleryImageResponse])
def list_gallery_images(db: Session = Depends(get_db)):
    images = (
        db.query(GalleryImage)
        .order_by(GalleryImage.created_at.desc())
        .all()
    )
    return [gallery_image_to_response(image) for image in images]


@router.get("/{image_id}/image")
def get_gallery_image(image_id: uuid.UUID, db: Session = Depends(get_db)):
    image = db.query(GalleryImage).filter(GalleryImage.id == image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )
    return Response(content=image.content, media_type=image.content_type)


@router.post(
    "",
    response_model=GalleryImageResponse,
    dependencies=[Depends(verify_admin_key)],
)
async def upload_gallery_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WebP, and GIF images are allowed",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be 5 MB or smaller",
        )

    image = GalleryImage(
        filename=file.filename or "gallery-image",
        content_type=file.content_type,
        content=content,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return gallery_image_to_response(image)


@router.delete(
    "/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_key)],
)
def delete_gallery_image(image_id: uuid.UUID, db: Session = Depends(get_db)):
    image = db.query(GalleryImage).filter(GalleryImage.id == image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )

    db.delete(image)
    db.commit()
