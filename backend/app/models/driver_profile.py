from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base
import enum

class DriverStatus(enum.Enum):
    ACTIVE = "Active"
    OFFLINE = "Offline"

class DriverProfile(Base):
    __tablename__ = "driver_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    license = Column(String(100), nullable=True)
    contact = Column(String(20), nullable=True)
    status = Column(Enum(DriverStatus), default=DriverStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
