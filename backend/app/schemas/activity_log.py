from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .user import UserResponse

class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    created_at: datetime
    user: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True
