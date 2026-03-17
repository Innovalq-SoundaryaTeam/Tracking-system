from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(Integer, ForeignKey("jobs.id"))

    amount = Column(Float, nullable=False)

    # Updated values
    payment_type = Column(String(20))   # UPI / COD / CREDIT / CASH_RECEIVED
    payment_status = Column(String(20)) # PAID / PENDING / RECEIVED

    recorded_by = Column(String(20))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job")