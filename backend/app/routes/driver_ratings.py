from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import get_db, User, Job, DriverRating
from ..schemas import DriverRatingCreate, DriverRatingResponse
from ..auth.dependencies import get_current_user, require_role
from ..utils import log_activity
from ..models.job import JobStatus

router = APIRouter(prefix="/driver-ratings", tags=["driver-ratings"])

@router.post("/", response_model=DriverRatingResponse)
def rate_driver(
    rating: DriverRatingCreate,
    current_user: User = Depends(require_role("SELLER")),
    db: Session = Depends(get_db)
):
    """Rate a driver for a completed job (SELLER only)"""
    # Check if job exists and belongs to current seller
    job = db.query(Job).filter(Job.id == rating.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to rate this job"
        )
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate completed jobs"
        )
    
    if job.assigned_driver_id != rating.driver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver ID does not match assigned driver"
        )
    
    # Check if rating already exists
    existing_rating = db.query(DriverRating).filter(
        DriverRating.job_id == rating.job_id
    ).first()
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job already rated"
        )
    
    # Create rating
    db_rating = DriverRating(
        job_id=rating.job_id,
        driver_id=rating.driver_id,
        rating=rating.rating,
        comments=rating.comments
    )
    
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    
    # Log activity
    log_activity(db, current_user.id, f"Rated driver {rating.driver_id} for job {job.serial_number}")
    
    return db_rating

@router.get("/driver/{driver_id}", response_model=list[DriverRatingResponse])
def get_driver_ratings(
    driver_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ratings for a specific driver"""
    # Check permissions
    if current_user.role.value not in ["ADMIN", "SELLER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view driver ratings"
        )
    
    # Get ratings
    ratings = db.query(DriverRating).filter(DriverRating.driver_id == driver_id).all()
    
    return ratings

@router.get("/my-performance", response_model=list[DriverRatingResponse])
def get_my_performance(
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Get current driver's performance ratings"""
    ratings = db.query(DriverRating).filter(DriverRating.driver_id == current_user.id).all()
    
    return ratings
