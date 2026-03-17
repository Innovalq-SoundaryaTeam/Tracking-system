from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DriverRatingCreate(BaseModel):
    job_id: int
    driver_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating must be between 1 and 5")
    comments: Optional[str] = None

class DriverRatingResponse(BaseModel):
    id: int
    job_id: int
    driver_id: int
    rating: int
    comments: Optional[str]
    rated_at: datetime
    
    class Config:
        from_attributes = True
