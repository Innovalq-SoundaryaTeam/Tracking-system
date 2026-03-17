from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from .database import Base

class ProductionStock(Base):
    __tablename__ = "production_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    total_produced = Column(Integer, default=0)
    available_stock = Column(Integer, default=0)
    damaged_stock = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
