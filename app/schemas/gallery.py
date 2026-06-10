import uuid
from datetime import datetime

from pydantic import BaseModel


class GalleryImageResponse(BaseModel):
    id: uuid.UUID
    filename: str
    content_type: str
    url_path: str
    created_at: datetime


def gallery_image_to_response(image) -> GalleryImageResponse:
    return GalleryImageResponse(
        id=image.id,
        filename=image.filename,
        content_type=image.content_type,
        url_path=f"/gallery/{image.id}/image",
        created_at=image.created_at,
    )
