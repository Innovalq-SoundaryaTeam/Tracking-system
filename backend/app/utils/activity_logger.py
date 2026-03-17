from sqlalchemy.orm import Session
from ..models import ActivityLog, User

def log_activity(db: Session, user_id: int, action: str):
    """Log user activity"""
    activity = ActivityLog(
        user_id=user_id,
        action=action
    )
    db.add(activity)
    db.commit()
