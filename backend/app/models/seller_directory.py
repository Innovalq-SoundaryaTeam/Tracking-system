from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class SellerDirectory(Base):
    __tablename__ = "seller_directory"
    
    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255), nullable=False)
    contact = Column(String(255), nullable=False)
    type = Column(String(100), nullable=True)
    aadhar = Column(String(20), nullable=True)
    rating = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
