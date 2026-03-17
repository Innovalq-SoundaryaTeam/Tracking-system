from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.driver_profile import DriverStatus

class DriverProfileCreate(BaseModel):
    user_id: int
    name: str
    license: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[DriverStatus] = DriverStatus.ACTIVE

class DriverProfileUpdate(BaseModel):
    name: Optional[str] = None
    license: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[DriverStatus] = None

class DriverProfileResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    license: Optional[str] = None
    contact: Optional[str] = None
    status: DriverStatus
    created_at: datetime
    
    class Config:
        from_attributes = True
