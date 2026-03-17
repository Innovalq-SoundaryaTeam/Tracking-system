from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import get_db
from ..models.seller_directory import SellerDirectory
from ..models.driver_profile import DriverProfile, DriverStatus
from ..schemas import (
    SellerDirectoryCreate, SellerDirectoryUpdate, SellerDirectoryResponse,
    DriverProfileCreate, DriverProfileUpdate, DriverProfileResponse
)
from ..auth.dependencies import require_role

router = APIRouter(prefix="/directory", tags=["directory"])

# Sellers Directory CRUD
@router.get("/sellers", response_model=List[SellerDirectoryResponse])
def list_sellers(
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    sellers = db.query(SellerDirectory).order_by(SellerDirectory.created_at.desc()).all()
    unique = {s.company: s for s in sellers}.values()
    return list(unique)

@router.post("/sellers", response_model=SellerDirectoryResponse, status_code=status.HTTP_201_CREATED)
def create_seller(
    payload: SellerDirectoryCreate,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = SellerDirectory(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/sellers/{seller_id}", response_model=SellerDirectoryResponse)
def update_seller(
    seller_id: int,
    payload: SellerDirectoryUpdate,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = db.query(SellerDirectory).filter(SellerDirectory.id == seller_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Seller not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/sellers/{seller_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seller(
    seller_id: int,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = db.query(SellerDirectory).filter(SellerDirectory.id == seller_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Seller not found")
    db.delete(item)
    db.commit()
    return None

# Drivers Directory CRUD
@router.get("/drivers", response_model=List[DriverProfileResponse])
def list_drivers(
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    drivers = db.query(DriverProfile).order_by(DriverProfile.created_at.desc()).all()
    unique = {d.name: d for d in drivers}.values()
    return list(unique)

@router.post("/drivers", response_model=DriverProfileResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    payload: DriverProfileCreate,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = DriverProfile(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/drivers/{driver_id}", response_model=DriverProfileResponse)
def update_driver(
    driver_id: int,
    payload: DriverProfileUpdate,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = db.query(DriverProfile).filter(DriverProfile.id == driver_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Driver not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/drivers/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    _: Depends = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    item = db.query(DriverProfile).filter(DriverProfile.id == driver_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Driver not found")
    db.delete(item)
    db.commit()
    return None
