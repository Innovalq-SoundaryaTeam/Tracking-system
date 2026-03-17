from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    SELLER = "SELLER"
    DRIVER = "DRIVER"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    created_jobs = relationship("Job", foreign_keys="Job.seller_id", back_populates="seller")
    assigned_jobs = relationship("Job", foreign_keys="Job.assigned_driver_id", back_populates="assigned_driver")
    received_ratings = relationship("DriverRating", back_populates="driver")
    activity_logs = relationship("ActivityLog", back_populates="user")
