from pydantic import BaseModel
from datetime import datetime

class ProductionStockResponse(BaseModel):
    id: int
    total_produced: int
    available_stock: int
    damaged_stock: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

class ProductionStockUpdate(BaseModel):
    total_produced: int
    available_stock: int
    damaged_stock: int
