from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models import get_db, User, Job, ProductionStock, DeliveryProof
from ..schemas import JobCreate, JobUpdate, JobResponse, JobListResponse
from ..auth.dependencies import get_current_user, require_role
from ..utils import generate_serial_number, log_activity
from ..models.job import JobStatus, JobPriority
from ..models.payment import Payment

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if not dt:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

@router.post("/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    current_user: User = Depends(require_role("SELLER","ADMIN")),
    db: Session = Depends(get_db)
):
    """Create a new job (SELLER only)"""
    # Check available stock (only enforce if stock has been explicitly configured)
    stock = db.query(ProductionStock).first()
    if stock and stock.total_produced > 0 and stock.available_stock < job.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock available"
        )
    
    # Generate serial number
    serial_number = generate_serial_number(db)
    # Calculate total price
    total_price = job.price_per_case * job.quantity

    # Determine payment status
    payment_status = "PENDING"

    if job.payment_mode == "UPI":
        payment_status = "PAID"

    elif job.payment_mode == "CREDIT":
        payment_status = "PENDING"

    elif job.payment_mode == "CASH_RECEIVED":
        payment_status = "RECEIVED"

    elif job.payment_mode == "COD":
        payment_status = "COLLECT_FROM_CUSTOMER"
    # Create job
    db_job = Job(
        serial_number=serial_number,
        seller_id=current_user.id,
        shop_name=job.shop_name,
        shop_contact=job.shop_contact,
        notes=job.notes,
        remarks=job.remarks,
        latitude=job.latitude,
        longitude=job.longitude,
        quantity=job.quantity,

        price_per_case=job.price_per_case,
        total_price=total_price,
        payment_mode=job.payment_mode,
        payment_status=payment_status,

        priority=job.priority,
        status=JobStatus.WAITING,
        flavors=job.flavors
    )
    
    db.add(db_job)

    # Update stock if configured
    if stock and stock.total_produced > 0:
        stock.available_stock -= job.quantity
    db.commit()

    db.refresh(db_job)

    # 🔹 Automatically create payment record
    payment = Payment(
        job_id=db_job.id,
        amount=total_price,
        payment_type=job.payment_mode,
        payment_status=payment_status,
        recorded_by="SELLER"
    )

    db.add(payment)
    db.commit()
    
    # Log activity
    log_activity(db, current_user.id, f"Created job {serial_number}")
    
    return db_job

@router.get("/my", response_model=JobListResponse)
def get_my_jobs(
    status_filter: Optional[JobStatus] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's jobs"""
    query = db.query(Job)
    
    # Filter by user role
    if current_user.role.value == "SELLER":
        query = query.filter(Job.seller_id == current_user.id)
    elif current_user.role.value == "DRIVER":
        query = query.filter(Job.assigned_driver_id == current_user.id)
    # ADMIN can see all jobs
    
    # Filter by status if provided
    if status_filter:
        query = query.filter(Job.status == status_filter)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/available", response_model=JobListResponse)
def get_available_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Get available jobs for drivers (WAITING status)"""
    query = db.query(Job).filter(
    Job.status == JobStatus.WAITING,
    Job.assigned_driver_id == None
)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        per_page=per_page
    )

@router.put("/{job_id}/assign", response_model=JobResponse)
def assign_job(
    job_id: int,
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Assign job to current driver"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.WAITING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not available for assignment"
        )
    
    # Assign job
    job.assigned_driver_id = current_user.id
    job.status = JobStatus.ASSIGNED
    job.assigned_at = datetime.utcnow()
    
    db.commit()
    db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Assigned job {job.serial_number}")
    
    return job

@router.put("/{job_id}/pickup", response_model=JobResponse)
def pickup_job(
    job_id: int,
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Mark job as picked up"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this job"
        )
    
    if job.status != JobStatus.ASSIGNED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not in assigned status"
        )
    
    # Update job
    job.status = JobStatus.PICKED_UP
    job.picked_up_at = datetime.utcnow()
    
    db.commit()
    db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Picked up job {job.serial_number}")
    
    return job

@router.put("/{job_id}/transit", response_model=JobResponse)
def start_transit(
    job_id: int,
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Mark job as in transit"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this job"
        )
    
    if job.status != JobStatus.PICKED_UP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not picked up"
        )
    
    # Update job
    job.status = JobStatus.IN_TRANSIT
    
    db.commit()
    db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Started transit for job {job.serial_number}")
    
    return job

@router.put("/{job_id}/complete", response_model=JobResponse)
def complete_job(
    job_id: int,
    current_user: User = Depends(require_role("DRIVER")),
    db: Session = Depends(get_db)
):
    """Mark job as completed (only after proof upload)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this job"
        )
    
    # Check if delivery proof exists
    proof = db.query(DeliveryProof).filter(DeliveryProof.job_id == job_id).first()
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery proof must be uploaded before completing job"
        )
    
    if job.status != JobStatus.PROOF_UPLOADED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery proof must be uploaded first"
        )
    
    # Update job
    job.status = JobStatus.COMPLETED
    job.completed_at = datetime.utcnow()

    # Update payment if COD
    payment = db.query(Payment).filter(Payment.job_id == job.id).first()

    if payment and payment.payment_type == "COD":
        payment.payment_status = "RECEIVED"
        
        db.commit()
        db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Completed job {job.serial_number}")
    
    return job

@router.get("/all", response_model=JobListResponse)
def get_all_jobs(
    status_filter: Optional[JobStatus] = Query(None),
    priority_filter: Optional[JobPriority] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Get all jobs (ADMIN only)"""
    query = db.query(Job)
    
    # Apply filters
    if status_filter:
        query = query.filter(Job.status == status_filter)
    
    if priority_filter:
        query = query.filter(Job.priority == priority_filter)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        per_page=per_page
    )

@router.put("/{job_id}/reassign", response_model=JobResponse)
def reassign_job(
    job_id: int,
    driver_id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Reassign job to different driver (ADMIN only)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if new driver exists and is a DRIVER
    new_driver = db.query(User).filter(
        and_(User.id == driver_id, User.role.value == "DRIVER", User.is_active == True)
    ).first()
    
    if not new_driver:
        raise HTTPException(status_code=404, detail="Driver not found or inactive")
    
    # Reassign job
    job.assigned_driver_id = driver_id
    job.status = JobStatus.ASSIGNED
    job.assigned_at = datetime.utcnow()
    
    db.commit()
    db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Reassigned job {job.serial_number} to driver {driver_id}")
    
    return job

@router.put("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
    job_id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Cancel job (ADMIN only)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status == JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel completed job"
        )
    
    # Update job
    job.status = JobStatus.CANCELLED
    
    # Restore stock if job was not completed
    if job.status != JobStatus.COMPLETED:
        stock = db.query(ProductionStock).first()
        if stock:
            stock.available_stock += job.quantity
            db.commit()
    
    db.refresh(job)
    
    # Log activity
    log_activity(db, current_user.id, f"Cancelled job {job.serial_number}")
    
    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_update: JobUpdate,
    current_user: User = Depends(require_role("SELLER", "ADMIN")),
    db: Session = Depends(get_db)
):
    """Edit a job (only if status is WAITING and seller owns it)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role.value == "SELLER" and job.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this job")

    if job.status != JobStatus.WAITING:
        raise HTTPException(status_code=400, detail="Only WAITING jobs can be edited")

    if job_update.shop_name is not None:
        job.shop_name = job_update.shop_name
    if job_update.shop_contact is not None:
        job.shop_contact = job_update.shop_contact
    if job_update.notes is not None:
        job.notes = job_update.notes
    if job_update.latitude is not None:
        job.latitude = job_update.latitude
    if job_update.longitude is not None:
        job.longitude = job_update.longitude
    if job_update.quantity is not None:
        job.quantity = job_update.quantity
        job.total_price = job.price_per_case * job_update.quantity
    if job_update.priority is not None:
        job.priority = job_update.priority

    db.commit()
    db.refresh(job)
    log_activity(db, current_user.id, f"Edited job {job.serial_number}")
    return job


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    current_user: User = Depends(require_role("SELLER", "ADMIN")),
    db: Session = Depends(get_db)
):
    """Delete a job (only if status is WAITING and seller owns it)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role.value == "SELLER" and job.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")

    if job.status != JobStatus.WAITING:
        raise HTTPException(status_code=400, detail="Only WAITING jobs can be deleted")

    # Restore stock
    stock = db.query(ProductionStock).first()
    if stock and stock.total_produced > 0:
        stock.available_stock += job.quantity

    # Delete related payment
    db.query(Payment).filter(Payment.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    log_activity(db, current_user.id, f"Deleted job {job.serial_number}")
    return {"message": "Job deleted successfully"}


@router.get("/daily-stats")
def get_daily_stats(
    date: str = Query(...),
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Get job statistics for a selected date (for calendar)
    """

    selected_date = datetime.strptime(date, "%Y-%m-%d")

    start = selected_date.replace(hour=0, minute=0, second=0)
    end = selected_date.replace(hour=23, minute=59, second=59)

    jobs = db.query(Job).filter(
        Job.created_at >= start,
        Job.created_at <= end
    ).all()

    transit = len([j for j in jobs if j.status == JobStatus.IN_TRANSIT])
    completed = len([j for j in jobs if j.status == JobStatus.COMPLETED])
    pending = len(jobs) - transit - completed

    return {
        "total_jobs": len(jobs),
        "waiting_jobs": pending,
        "transit_jobs": transit,
        "completed_jobs": completed
    }

@router.get("/jobs-by-date")
def get_jobs_by_date(
    date: str = Query(...),
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    selected_date = datetime.strptime(date, "%Y-%m-%d")

    start = selected_date.replace(hour=0, minute=0, second=0)
    end = selected_date.replace(hour=23, minute=59, second=59)

    jobs = db.query(Job).filter(
        Job.created_at >= start,
        Job.created_at <= end
    ).all()

    return {
        "jobs": [
            {
                "id": j.id,
                "serial_number": j.serial_number,
                "shop_name": j.shop_name,
                "status": j.status.value,
                "quantity": j.quantity,
                "payment_mode": j.payment_mode,
                "payment_status": j.payment_status,
                "total_price": j.total_price,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
        "total": len(jobs)
    }

@router.get("/pickup-alerts")
def get_pickup_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy pickup alerts."""
    now = datetime.utcnow()
    jobs = db.query(Job).filter(Job.status == JobStatus.WAITING).all()
    alerts = []

    for job in jobs:
        if not job.created_at:
            continue

        hours_passed = (now - job.created_at).total_seconds() / 3600
        priority_val = job.priority.value if hasattr(job.priority, "value") else str(job.priority)

        if current_user.role.value == "ADMIN" and hours_passed >= 48:
            alerts.append({
                "job_id": job.id,
                "serial_number": job.serial_number,
                "shop_name": job.shop_name,
                "priority": priority_val,
                "hours_passed": round(hours_passed, 1),
                "message": f"Job {job.serial_number} is overdue (>48h)."
            })

        if current_user.role.value == "DRIVER" and hours_passed < 48:
            alerts.append({
                "job_id": job.id,
                "serial_number": job.serial_number,
                "shop_name": job.shop_name,
                "priority": priority_val,
                "hours_passed": round(hours_passed, 1),
                "message": f"New Job {job.serial_number} available at {job.shop_name}."
            })

    return {"alerts": alerts, "total_alerts": len(alerts)}

@router.get("/assignment-alerts")
def get_assignment_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Notification rules:
    - Seller posts job -> notify drivers (new available jobs)
    - Driver warning at 47h50m
    - If accepted -> notify seller + admin
    - If not accepted by 48h -> notify admin (expired alert)
    """
    now = datetime.now(timezone.utc)

    waiting_jobs = db.query(Job).filter(
        Job.status == JobStatus.WAITING,
        Job.assigned_driver_id == None
    ).all()

    assigned_jobs = db.query(Job).filter(
        Job.status == JobStatus.ASSIGNED,
        Job.assigned_at != None
    ).all()

    driver_new_job_alerts = []
    driver_milestone_reminders = []
    admin_new_job_alerts = []
    admin_milestone_reminders = []
    admin_expired_alerts = []
    acceptance_alerts = []

    for job in waiting_jobs:
        created_at = _to_utc(job.created_at)
        if not created_at:
            continue

        minutes_passed = int((now - created_at).total_seconds() // 60)
        if minutes_passed < 0:
            minutes_passed = 0

        base_alert = {
            "job_id": job.id,
            "serial_number": job.serial_number,
            "shop_name": job.shop_name,
            "seller_id": job.seller_id,
            "minutes_passed": minutes_passed,
            "minutes_left": max((48 * 60) - minutes_passed, 0)
        }

        # New job popup immediately after posting (first 10 minutes).
        if minutes_passed <= 10:
            driver_new_job_alerts.append(base_alert)
            admin_new_job_alerts.append(base_alert)

        # Milestone reminders for driver: 30 min, 4 hour, 8 hour.
        reminder_checkpoints = [
            (30, "30_MIN"),
            (240, "4_HOUR"),
            (480, "8_HOUR"),
        ]
        for checkpoint_minutes, reminder_type in reminder_checkpoints:
            # 5-minute window so polling can catch the reminder.
            if checkpoint_minutes <= minutes_passed < (checkpoint_minutes + 5):
                driver_milestone_reminders.append({
                    **base_alert,
                    "reminder_type": reminder_type,
                    "reminder_at_minutes": checkpoint_minutes
                })
                admin_milestone_reminders.append({
                    **base_alert,
                    "reminder_type": reminder_type,
                    "reminder_at_minutes": checkpoint_minutes
                })

        # No driver accepted within 48h.
        if minutes_passed >= (48 * 60):
            admin_expired_alerts.append(base_alert)

    # If driver accepts, notify seller + admin.
    # Keep "recent acceptance" alerts for the last 60 minutes.
    for job in assigned_jobs:
        assigned_at = _to_utc(job.assigned_at)
        if not assigned_at:
            continue

        minutes_since_assignment = int((now - assigned_at).total_seconds() // 60)
        if 0 <= minutes_since_assignment <= 60:
            acceptance_alerts.append({
                "job_id": job.id,
                "serial_number": job.serial_number,
                "shop_name": job.shop_name,
                "seller_id": job.seller_id,
                "assigned_driver_id": job.assigned_driver_id,
                "assigned_minutes_ago": minutes_since_assignment
            })

    if current_user.role.value == "DRIVER":
        return {
            "role": "DRIVER",
            "new_job_alerts": driver_new_job_alerts,
            "driver_milestone_reminders": driver_milestone_reminders,
            "total_notifications": len(driver_new_job_alerts) + len(driver_milestone_reminders)
        }

    if current_user.role.value == "SELLER":
        seller_acceptance = [a for a in acceptance_alerts if a["seller_id"] == current_user.id]
        return {
            "role": "SELLER",
            "seller_acceptance_alerts": seller_acceptance,
            "total_notifications": len(seller_acceptance)
        }

    if current_user.role.value == "ADMIN":
        return {
            "role": "ADMIN",
            "admin_new_job_alerts": admin_new_job_alerts,
            "admin_acceptance_alerts": acceptance_alerts,
            "admin_expired_alerts": admin_expired_alerts,
            "admin_milestone_reminders": admin_milestone_reminders,
            "total_notifications": len(admin_new_job_alerts) + len(acceptance_alerts) + len(admin_expired_alerts) + len(admin_milestone_reminders)
        }

    return {"role": current_user.role.value, "total_notifications": 0}

class CollectPaymentBody(BaseModel):
    payment_method: Optional[str] = None  # CASH_RECEIVED, UPI, CREDIT
    remarks: Optional[str] = None


@router.post("/{job_id}/collect-payment")
def collect_payment(
    job_id: int,
    body: CollectPaymentBody = CollectPaymentBody(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DRIVER", "SELLER"))
):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.payment_status == "RECEIVED":
        raise HTTPException(status_code=400, detail="Payment already collected")

    if job.payment_mode not in ("COD", "CASH_RECEIVED", "UPI", "CREDIT"):
        raise HTTPException(status_code=400, detail="Payment already settled for this job")

    # Determine effective payment mode
    effective_mode = body.payment_method or job.payment_mode
    payment_type_map = {
        "Cash": "CASH_RECEIVED",
        "UPI": "UPI",
        "Credit": "CREDIT",
        "CASH_RECEIVED": "CASH_RECEIVED",
    }
    effective_mode = payment_type_map.get(effective_mode, effective_mode)

    job.payment_status = "RECEIVED"
    job.payment_mode = effective_mode
    if hasattr(current_user, 'id'):
        job.collected_by_driver = current_user.id
    job.collected_time = datetime.utcnow()

    # Update remarks if provided
    if body.remarks:
        job.remarks = body.remarks

    # Update payment record
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if payment:
        payment.payment_type = effective_mode
        payment.payment_status = "RECEIVED"

    db.commit()

    return {
        "message": "Payment collected successfully",
        "payment_status": "RECEIVED",
        "payment_mode": effective_mode
    }
