from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import get_db, User, ProductionStock
from ..schemas.production_stock import ProductionStockResponse, ProductionStockUpdate
from ..auth.dependencies import get_current_user, require_role
from ..utils import log_activity

router = APIRouter(prefix="/stock", tags=["production-stock"])

@router.get("/", response_model=ProductionStockResponse)
def get_stock(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current production stock levels"""
    stock = db.query(ProductionStock).first()
    
    if not stock:
        # Create initial stock record if it doesn't exist
        stock = ProductionStock(
            total_produced=0,
            available_stock=0,
            damaged_stock=0
        )
        db.add(stock)
        db.commit()
        db.refresh(stock)
    
    return stock

@router.put("/", response_model=ProductionStockResponse)
def update_stock(
    stock_update: ProductionStockUpdate,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Update production stock (ADMIN only)"""
    stock = db.query(ProductionStock).first()
    
    if not stock:
        # Create initial stock record if it doesn't exist
        stock = ProductionStock(
            total_produced=stock_update.total_produced,
            available_stock=stock_update.available_stock,
            damaged_stock=stock_update.damaged_stock
        )
        db.add(stock)
    else:
        # Update existing stock
        stock.total_produced = stock_update.total_produced
        stock.available_stock = stock_update.available_stock
        stock.damaged_stock = stock_update.damaged_stock
    
    db.commit()
    db.refresh(stock)
    
    # Log activity
    log_activity(db, current_user.id, f"Updated stock: Total={stock_update.total_produced}, Available={stock_update.available_stock}, Damaged={stock_update.damaged_stock}")
    
    return stock
