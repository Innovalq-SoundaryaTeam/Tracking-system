from pydantic import BaseModel

class PaymentCreate(BaseModel):

    job_id: int
    amount: float
    payment_type: str
    payment_status: str
    recorded_by: str