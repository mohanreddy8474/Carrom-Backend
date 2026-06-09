import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import verify_admin_key
from app.db.session import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.post("", response_model=CategoryResponse, dependencies=[Depends(verify_admin_key)])
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(Category)
        .filter(Category.gender == data.gender, Category.format == data.format)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this gender and format already exists",
        )
    category = Category(name=data.name, gender=data.gender, format=data.format)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse, dependencies=[Depends(verify_admin_key)])
def update_category(
    category_id: uuid.UUID, data: CategoryUpdate, db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if data.name is not None:
        category.name = data.name
    if data.gender is not None:
        category.gender = data.gender
    if data.format is not None:
        category.format = data.format
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_admin_key)])
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(category)
    db.commit()
