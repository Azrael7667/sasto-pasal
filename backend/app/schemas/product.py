from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    name: str
    category: str
    sku: Optional[str] = None
    sell_price: float
    cost_price: float
    current_stock: float = 0
    reorder_point: float = 20
    daily_demand: float = 1
    unit: str = "pcs"
    supplier: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sell_price: Optional[float] = None
    cost_price: Optional[float] = None
    current_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    daily_demand: Optional[float] = None
    unit: Optional[str] = None
    supplier: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    store_id: int
    name: str
    category: str
    sku: Optional[str] = None
    sell_price: float
    cost_price: float
    current_stock: float
    reorder_point: float
    daily_demand: float
    unit: str
    supplier: Optional[str] = None
    days_of_stock: float
    status: str
    stock_value: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    product_id: int
    type: str
    quantity: float
    reason: Optional[str] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    store_id: int
    type: str
    quantity: float
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
