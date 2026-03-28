from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    segment: str = "Walk-in"
    credit_limit: float = 10000

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    credit_limit: Optional[float] = None

class CustomerResponse(BaseModel):
    id: int
    store_id: int
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    segment: str
    outstanding_credit: float
    credit_limit: float
    credit_days: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class KhataEntryCreate(BaseModel):
    customer_id: int
    type: str
    amount: float
    description: Optional[str] = None
    status: str = "Pending"

class KhataEntryResponse(BaseModel):
    id: int
    store_id: int
    customer_id: int
    customer_name: Optional[str] = None
    type: str
    amount: float
    description: Optional[str] = None
    status: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
