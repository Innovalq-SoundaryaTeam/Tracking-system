from pydantic import BaseModel
from datetime import datetime

class DeliveryProofCreate(BaseModel):
    job_id: int
    latitude: float
    longitude: float

class DeliveryProofResponse(BaseModel):
    id: int
    job_id: int
    image_path: str
    latitude: float
    longitude: float
    uploaded_at: datetime
    
    class Config:
        from_attributes = True
