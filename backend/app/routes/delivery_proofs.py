from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..models import get_db, User, Job, DeliveryProof
from ..schemas import DeliveryProofCreate, DeliveryProofResponse
from ..auth.dependencies import get_current_user, require_role
from ..utils import save_upload_file, log_activity
from ..models.job import JobStatus

router = APIRouter(prefix="/delivery-proofs", tags=["delivery-proofs"])

@router.post("/upload/{job_id}", response_model=DeliveryProofResponse)
def upload_delivery_proof(
    job_id: int,
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Upload delivery proof for a job"""
    # Check if job exists and is assigned to current driver
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this job"
        )
    
    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job must be in transit to upload proof"
        )
    
    # Check if proof already exists
    existing_proof = db.query(DeliveryProof).filter(DeliveryProof.job_id == job_id).first()
    if existing_proof:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery proof already uploaded for this job"
        )
    
    # Save uploaded file
    image_path = save_upload_file(file, "delivery_proofs")
    
    # Create delivery proof
    delivery_proof = DeliveryProof(
        job_id=job_id,
        image_path=image_path,
        latitude=latitude,
        longitude=longitude
    )
    
    db.add(delivery_proof)
    
    # Update job status
    job.status = JobStatus.PROOF_UPLOADED
    job.delivered_at = datetime.utcnow()
    
    db.commit()
    db.refresh(delivery_proof)
    
    # Log activity
    log_activity(db, current_user.id, f"Uploaded delivery proof for job {job.serial_number}")
    
    return delivery_proof

@router.get("/job/{job_id}", response_model=DeliveryProofResponse)
def get_job_delivery_proof(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delivery proof for a specific job"""
    # Check if user has access to this job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check permissions
    if (current_user.role.value == "SELLER" and job.seller_id != current_user.id) or \
       (current_user.role.value == "DRIVER" and job.assigned_driver_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this job's proof"
        )
    
    # Get delivery proof
    proof = db.query(DeliveryProof).filter(DeliveryProof.job_id == job_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Delivery proof not found")
    
    return proof
