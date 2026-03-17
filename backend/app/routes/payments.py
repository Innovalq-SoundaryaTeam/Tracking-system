from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..models import get_db
from ..models.job import Job
from ..auth.dependencies import require_role

router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)


@router.get("/summary")
def get_payment_summary(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("ADMIN"))
):

    jobs = db.query(
        Job.payment_mode,
        Job.payment_status,
        Job.total_price
    ).all()

    total_received = 0
    total_pending = 0
    upi_received = 0
    cash_received = 0
    cod_received = 0
    credit_pending = 0

    for payment_mode, payment_status, amount in jobs:

        if payment_status in ["PAID", "RECEIVED"]:
            total_received += amount

            if payment_mode == "UPI":
                upi_received += amount

            elif payment_mode == "CASH_RECEIVED":
                cash_received += amount

            elif payment_mode == "COD":
                cod_received += amount

            elif payment_mode == "CREDIT":
                # Credit collected by admin counts as cash received
                cash_received += amount

        elif payment_status == "PENDING":
            total_pending += amount

            if payment_mode == "CREDIT":
                credit_pending += amount

        # COLLECT_FROM_CUSTOMER: COD not yet collected — excluded from both totals

    return {
        "total_received": total_received,
        "total_pending": total_pending,
        "upi_received": upi_received,
        "cash_received": cash_received,
        "cod_received": cod_received,
        "credit_pending": credit_pending
    }


@router.get("/credit-pending")
def get_credit_pending_jobs(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("ADMIN"))
):
    jobs = db.query(Job).filter(
        Job.payment_mode == "CREDIT",
        Job.payment_status == "PENDING"
    ).all()

    return {
        "jobs": [
            {
                "id": job.id,
                "serial_number": job.serial_number,
                "shop_name": job.shop_name,
                "shop_contact": job.shop_contact,
                "total_price": job.total_price,
                "status": job.status.value,
                "created_at": job.created_at.isoformat() if job.created_at else None,
            }
            for job in jobs
        ]
    }


@router.put("/credit/{job_id}/collect")
def collect_credit_payment(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("ADMIN"))
):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.payment_mode != "CREDIT":
        raise HTTPException(status_code=400, detail="This job is not a CREDIT payment")

    if job.payment_status != "PENDING":
        raise HTTPException(status_code=400, detail="Payment already received")

    job.payment_status = "RECEIVED"
    db.commit()

    return {"message": "Credit payment marked as received", "job_id": job_id}