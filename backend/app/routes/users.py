from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..models import get_db, User
from ..schemas import UserResponse
from ..auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/drivers", response_model=List[UserResponse])
def get_drivers(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    drivers = db.query(User).filter(
        User.role == "DRIVER",
        User.is_active == True
    ).all()
    
    return drivers


@router.get("/sellers", response_model=List[UserResponse])
def get_sellers(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    sellers = db.query(User).filter(
        User.role == "SELLER",
        User.is_active == True
    ).all()
    
    return sellers

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user
