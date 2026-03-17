from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SellerDirectoryCreate(BaseModel):
    company: str
    contact: str
    type: Optional[str] = None
    aadhar: Optional[str] = None
    rating: Optional[str] = None

class SellerDirectoryUpdate(BaseModel):
    company: Optional[str] = None
    contact: Optional[str] = None
    type: Optional[str] = None
    aadhar: Optional[str] = None
    rating: Optional[str] = None

class SellerDirectoryResponse(BaseModel):
    id: int
    company: str
    contact: str
    type: Optional[str] = None
    aadhar: Optional[str] = None
    rating: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
