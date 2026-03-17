from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.job import JobPriority, JobStatus
from .delivery_proof import DeliveryProofResponse


# ✅ Create Job Schema
class JobCreate(BaseModel):
    shop_name: str
    shop_contact: str
    notes: Optional[str] = None
    remarks: Optional[str] = None
    latitude: float
    longitude: float
    quantity: int
    flavors: Optional[str] = None  # JSON string of flavor breakdown

    price_per_case: float
    payment_mode: str

    priority: JobPriority = JobPriority.NORMAL


# ✅ Update Job Schema
class JobUpdate(BaseModel):
    shop_name: Optional[str] = None
    shop_contact: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    quantity: Optional[int] = None
    priority: Optional[JobPriority] = None
    status: Optional[JobStatus] = None
    assigned_driver_id: Optional[int] = None


# ✅ Job Response Schema
class JobResponse(BaseModel):
    id: int
    serial_number: str
    seller_id: int
    shop_name: str
    shop_contact: str
    notes: Optional[str]
    remarks: Optional[str]
    latitude: float
    longitude: float
    quantity: int
    price_per_case: float
    total_price: float
    payment_mode: str
    payment_status: str
    priority: JobPriority
    status: JobStatus
    assigned_driver_id: Optional[int]
    created_at: datetime
    assigned_at: Optional[datetime]
    picked_up_at: Optional[datetime]
    delivered_at: Optional[datetime]
    completed_at: Optional[datetime]
    flavors: Optional[str] = None  # JSON string of flavor breakdown
    delivery_proofs: List[DeliveryProofResponse] = []

    class Config:
        from_attributes = True


# ✅ Job List Response
class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    page: int
    per_page: int