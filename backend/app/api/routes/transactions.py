from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.db.base import get_db
from app.models.models import (
    Transaction, TransactionItem, Product,
    Customer, User, KhataEntry
)
from app.schemas.transaction import (
    TransactionCreate, TransactionResponse,
    TransactionItemResponse, DailySummary
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions & POS"])

def build_transaction_response(txn: Transaction, db: Session) -> TransactionResponse:
    items = db.query(TransactionItem).filter(
        TransactionItem.transaction_id == txn.id
    ).all()

    item_responses = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_responses.append(TransactionItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else "Unknown",
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
        ))

    customer_name = None
    if txn.customer_id:
        customer = db.query(Customer).filter(Customer.id == txn.customer_id).first()
        customer_name = customer.name if customer else None

    return TransactionResponse(
        id=txn.id,
        store_id=txn.store_id,
        customer_id=txn.customer_id,
        customer_name=customer_name,
        type=txn.type,
        subtotal=txn.subtotal,
        discount=txn.discount,
        total=txn.total,
        payment_mode=txn.payment_mode,
        notes=txn.notes,
        items=item_responses,
        created_at=txn.created_at,
    )

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not data.items:
        raise HTTPException(status_code=400, detail="Transaction must have at least one item")

    subtotal = 0
    validated_items = []

    for item in data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.store_id == current_user.store_id,
            Product.is_active == True
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.current_stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Available: {product.current_stock}"
            )
        item_total = item.unit_price * item.quantity
        subtotal  += item_total
        validated_items.append((product, item, item_total))

    total = round(subtotal - data.discount, 2)

    txn = Transaction(
        store_id=current_user.store_id,
        customer_id=data.customer_id,
        type="sale",
        subtotal=round(subtotal, 2),
        discount=data.discount,
        total=total,
        payment_mode=data.payment_mode,
        notes=data.notes,
    )
    db.add(txn)
    db.flush()

    for product, item, item_total in validated_items:
        txn_item = TransactionItem(
            transaction_id=txn.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item_total,
        )
        db.add(txn_item)
        product.current_stock -= item.quantity

    # If payment is credit — add to khata automatically
    if data.payment_mode == "Credit" and data.customer_id:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if customer:
            customer.outstanding_credit += total
            khata = KhataEntry(
                store_id=current_user.store_id,
                customer_id=data.customer_id,
                type="Credit Given",
                amount=total,
                description=f"Credit sale - Transaction #{txn.id}",
                status="Pending",
            )
            db.add(khata)

    db.commit()
    db.refresh(txn)
    return build_transaction_response(txn, db)

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    payment_mode: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(
        Transaction.store_id == current_user.store_id
    )
    if payment_mode:
        query = query.filter(Transaction.payment_mode == payment_mode)
    if date_from:
        query = query.filter(Transaction.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Transaction.created_at <= datetime.fromisoformat(date_to))

    transactions = query.order_by(
        Transaction.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [build_transaction_response(t, db) for t in transactions]

@router.get("/daily-summary")
def get_daily_summary(
    target_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if target_date:
        day = datetime.fromisoformat(target_date).date()
    else:
        day = date.today()

    day_start = datetime.combine(day, datetime.min.time())
    day_end   = datetime.combine(day, datetime.max.time())

    txns = db.query(Transaction).filter(
        Transaction.store_id == current_user.store_id,
        Transaction.created_at >= day_start,
        Transaction.created_at <= day_end,
    ).all()

    total_revenue = sum(t.total for t in txns)
    cash_sales    = sum(t.total for t in txns if t.payment_mode == "Cash")
    credit_sales  = sum(t.total for t in txns if t.payment_mode == "Credit")
    digital_sales = sum(t.total for t in txns if t.payment_mode in ["Esewa","Khalti","Bank Transfer"])

    # Calculate profit from items
    total_profit = 0
    product_sales = {}
    for txn in txns:
        items = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == txn.id
        ).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                profit = (item.unit_price - product.cost_price) * item.quantity
                total_profit += profit
                name = product.name
                if name not in product_sales:
                    product_sales[name] = 0
                product_sales[name] += item.total_price

    top_products = sorted(
        [{"name": k, "revenue": round(v, 2)} for k, v in product_sales.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:5]

    return {
        "date":               str(day),
        "total_revenue":      round(total_revenue, 2),
        "total_profit":       round(total_profit, 2),
        "total_transactions": len(txns),
        "cash_sales":         round(cash_sales, 2),
        "credit_sales":       round(credit_sales, 2),
        "digital_sales":      round(digital_sales, 2),
        "top_products":       top_products,
    }

@router.get("/range-summary")
def get_range_summary(
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start = datetime.now() - timedelta(days=days)
    txns  = db.query(Transaction).filter(
        Transaction.store_id == current_user.store_id,
        Transaction.created_at >= start,
    ).all()

    total_revenue = sum(t.total for t in txns)
    total_profit  = 0
    for txn in txns:
        items = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == txn.id
        ).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                total_profit += (item.unit_price - product.cost_price) * item.quantity

    return {
        "period_days":        days,
        "total_revenue":      round(total_revenue, 2),
        "total_profit":       round(total_profit, 2),
        "total_transactions": len(txns),
        "avg_daily_revenue":  round(total_revenue / days, 2),
        "avg_transaction":    round(total_revenue / len(txns), 2) if txns else 0,
        "payment_breakdown": {
            "cash":    round(sum(t.total for t in txns if t.payment_mode == "Cash"), 2),
            "credit":  round(sum(t.total for t in txns if t.payment_mode == "Credit"), 2),
            "digital": round(sum(t.total for t in txns if t.payment_mode in ["Esewa","Khalti","Bank Transfer"]), 2),
        }
    }

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    txn = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.store_id == current_user.store_id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return build_transaction_response(txn, db)
