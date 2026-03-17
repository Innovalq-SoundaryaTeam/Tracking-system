from sqlalchemy.orm import Session
from ..models import Job

def generate_serial_number(db: Session) -> str:
    """Generate unique serial number like SN00001"""
    last_job = db.query(Job).order_by(Job.id.desc()).first()
    
    if last_job and last_job.serial_number:
        # Extract numeric part and increment
        last_num = int(last_job.serial_number[2:])  # Remove 'SN' prefix
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"SN{new_num:05d}"  # Pad with zeros to make 5 digits
