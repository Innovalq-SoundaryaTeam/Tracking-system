from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class JobPriority(enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

class JobStatus(enum.Enum):
    WAITING = "WAITING"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    PROOF_UPLOADED = "PROOF_UPLOADED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(50), unique=True, index=True, nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shop_name = Column(String(255), nullable=False)
    shop_contact = Column(String(20), nullable=False)
    notes = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    price_per_case = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    payment_mode = Column(String(20), nullable=False)
    payment_status = Column(String(20), default="PENDING")
    priority = Column(Enum(JobPriority), default=JobPriority.NORMAL)
    status = Column(Enum(JobStatus), default=JobStatus.WAITING)
    assigned_driver_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True))
    picked_up_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    collected_by_driver = Column(Integer, ForeignKey("users.id"))
    collected_time = Column(DateTime(timezone=True))
    remarks = Column(Text)
    flavors = Column(Text)  # JSON string: [{"id": 1, "name": "...", "qty": 5}, ...]

    # Relationships
    seller = relationship("User", foreign_keys=[seller_id], back_populates="created_jobs")
    assigned_driver = relationship("User", foreign_keys=[assigned_driver_id], back_populates="assigned_jobs")
    delivery_proofs = relationship("DeliveryProof", back_populates="job")
    driver_ratings = relationship("DriverRating", back_populates="job")
