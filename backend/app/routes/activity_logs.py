from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from ..models import get_db, User, ActivityLog
from ..schemas import ActivityLogResponse
from ..auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])

@router.get("/", response_model=List[ActivityLogResponse])
def get_activity_logs(
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Get activity logs (ADMIN only)"""
    query = db.query(ActivityLog).options(joinedload(ActivityLog.user))
    
    # Filter by user if specified
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    # Order by latest first
    query = query.order_by(ActivityLog.created_at.desc())
    
    # Apply pagination
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return logs

@router.get("/my", response_model=List[ActivityLogResponse])
def get_my_activity_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's activity logs"""
    query = db.query(ActivityLog).options(joinedload(ActivityLog.user)).filter(
        ActivityLog.user_id == current_user.id
    ).order_by(ActivityLog.created_at.desc())
    
    # Apply pagination
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return logs
