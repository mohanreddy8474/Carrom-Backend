import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CategoryFormat, Gender


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("gender", "format", name="uq_category_gender_format"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[Gender] = mapped_column(Enum(Gender, name="gender_enum"), nullable=False)
    format: Mapped[CategoryFormat] = mapped_column(
        Enum(CategoryFormat, name="category_format"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    groups = relationship("Group", back_populates="category", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="category")
    matches = relationship("Match", back_populates="category")
