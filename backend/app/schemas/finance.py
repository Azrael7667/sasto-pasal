from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InvoiceItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float

class InvoiceCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[InvoiceItemCreate]
    discount: float = 0
    payment_mode: str = "Cash"
    status: str = "Paid"
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    store_id: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    invoice_number: str
    subtotal: float
    discount: float
    total: float
    payment_mode: str
    status: str
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier: Optional[str] = None
    category: str
    description: str
    amount: float
    payment_mode: str = "Cash"
    status: str = "Paid"
    date: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: int
    store_id: int
    supplier: Optional[str] = None
    category: str
    description: str
    amount: float
    payment_mode: str
    status: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
