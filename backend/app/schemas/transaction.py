from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TransactionItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float

class TransactionCreate(BaseModel):
    customer_id: Optional[int] = None
    items: List[TransactionItemCreate]
    discount: float = 0
    payment_mode: str = "Cash"
    notes: Optional[str] = None

class TransactionItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: float
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    store_id: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    type: str
    subtotal: float
    discount: float
    total: float
    payment_mode: str
    notes: Optional[str] = None
    items: List[TransactionItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

class DailySummary(BaseModel):
    date: str
    total_revenue: float
    total_profit: float
    total_transactions: int
    cash_sales: float
    credit_sales: float
    digital_sales: float
    top_products: List[dict] = []
