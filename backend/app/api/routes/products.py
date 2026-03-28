from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.models import Product, StockMovement, User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    StockMovementCreate, StockMovementResponse
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/products", tags=["Products & Inventory"])

def calculate_product_status(product: Product) -> dict:
    days_of_stock = round(product.current_stock / product.daily_demand, 1) if product.daily_demand > 0 else 0
    if days_of_stock < 7:
        status = "Critical"
    elif days_of_stock < 14:
        status = "Warning"
    else:
        status = "OK"
    stock_value = round(product.current_stock * product.sell_price, 2)
    return {"days_of_stock": days_of_stock, "status": status, "stock_value": stock_value}

def product_to_response(product: Product) -> ProductResponse:
    calc = calculate_product_status(product)
    return ProductResponse(
        id=product.id,
        store_id=product.store_id,
        name=product.name,
        category=product.category,
        sku=product.sku,
        sell_price=product.sell_price,
        cost_price=product.cost_price,
        current_stock=product.current_stock,
        reorder_point=product.reorder_point,
        daily_demand=product.daily_demand,
        unit=product.unit,
        supplier=product.supplier,
        days_of_stock=calc["days_of_stock"],
        status=calc["status"],
        stock_value=calc["stock_value"],
        is_active=product.is_active,
        created_at=product.created_at,
    )

@router.get("", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(
        Product.store_id == current_user.store_id,
        Product.is_active == True
    )
    if category:
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    products = query.all()

    result = [product_to_response(p) for p in products]

    if status_filter:
        result = [p for p in result if p.status == status_filter]

    return result

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = Product(
        store_id=current_user.store_id,
        name=data.name,
        category=data.category,
        sku=data.sku,
        sell_price=data.sell_price,
        cost_price=data.cost_price,
        current_stock=data.current_stock,
        reorder_point=data.reorder_point,
        daily_demand=data.daily_demand,
        unit=data.unit,
        supplier=data.supplier,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_to_response(product)

@router.get("/summary")
def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(
        Product.store_id == current_user.store_id,
        Product.is_active == True
    ).all()

    result = [product_to_response(p) for p in products]
    critical = [p for p in result if p.status == "Critical"]
    warning  = [p for p in result if p.status == "Warning"]
    ok       = [p for p in result if p.status == "OK"]

    return {
        "total_products":   len(result),
        "total_stock_value":round(sum(p.stock_value for p in result), 2),
        "critical_count":   len(critical),
        "warning_count":    len(warning),
        "ok_count":         len(ok),
        "critical_items":   [{"id": p.id, "name": p.name, "days_of_stock": p.days_of_stock} for p in critical],
        "low_stock_items":  [{"id": p.id, "name": p.name, "days_of_stock": p.days_of_stock} for p in warning],
    }

@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(
        Product.store_id == current_user.store_id,
        Product.is_active == True
    ).all()
    categories = list(set(p.category for p in products))
    return {"categories": categories}

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.store_id == current_user.store_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_response(product)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.store_id == current_user.store_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product_to_response(product)

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.store_id == current_user.store_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
    return {"message": f"Product '{product.name}' deleted successfully"}

@router.post("/stock/movement", response_model=StockMovementResponse)
def record_stock_movement(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == data.product_id,
        Product.store_id == current_user.store_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if data.type == "in":
        product.current_stock += data.quantity
    elif data.type == "out":
        if product.current_stock < data.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        product.current_stock -= data.quantity
    elif data.type == "adjustment":
        product.current_stock = data.quantity

    movement = StockMovement(
        store_id=current_user.store_id,
        product_id=data.product_id,
        type=data.type,
        quantity=data.quantity,
        reason=data.reason,
        notes=data.notes,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

@router.get("/{product_id}/movements", response_model=List[StockMovementResponse])
def get_stock_movements(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.store_id == current_user.store_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    movements = db.query(StockMovement).filter(
        StockMovement.product_id == product_id
    ).order_by(StockMovement.created_at.desc()).all()
    return movements
