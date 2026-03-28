from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.models.models import Invoice, Purchase, Product, Customer, User
from app.schemas.finance import (
    InvoiceCreate, InvoiceResponse,
    PurchaseCreate, PurchaseResponse
)
from app.core.deps import get_current_user

router = APIRouter(tags=["Finance"])

def generate_invoice_number(store_id: int, db: Session) -> str:
    count = db.query(Invoice).filter(Invoice.store_id == store_id).count()
    return f"INV-{store_id:02d}-{count+1:04d}"

# ── INVOICES ─────────────────────────────────────────

@router.post("/api/invoices", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subtotal = 0
    for item in data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.store_id == current_user.store_id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        subtotal += item.unit_price * item.quantity

    total = round(subtotal - data.discount, 2)

    customer_name = data.customer_name
    if data.customer_id and not customer_name:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if customer:
            customer_name = customer.name

    due_date = None
    if data.due_date:
        due_date = datetime.fromisoformat(data.due_date)

    invoice = Invoice(
        store_id=current_user.store_id,
        customer_id=data.customer_id,
        invoice_number=generate_invoice_number(current_user.store_id, db),
        subtotal=round(subtotal, 2),
        discount=data.discount,
        total=total,
        payment_mode=data.payment_mode,
        status=data.status,
        notes=data.notes,
        due_date=due_date,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        store_id=invoice.store_id,
        customer_id=invoice.customer_id,
        customer_name=customer_name,
        invoice_number=invoice.invoice_number,
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        total=invoice.total,
        payment_mode=invoice.payment_mode,
        status=invoice.status,
        notes=invoice.notes,
        due_date=invoice.due_date,
        created_at=invoice.created_at,
    )

@router.get("/api/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).filter(Invoice.store_id == current_user.store_id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    invoices = query.order_by(Invoice.created_at.desc()).limit(limit).all()

    result = []
    for inv in invoices:
        customer_name = None
        if inv.customer_id:
            customer = db.query(Customer).filter(Customer.id == inv.customer_id).first()
            customer_name = customer.name if customer else None
        result.append(InvoiceResponse(
            id=inv.id,
            store_id=inv.store_id,
            customer_id=inv.customer_id,
            customer_name=customer_name,
            invoice_number=inv.invoice_number,
            subtotal=inv.subtotal,
            discount=inv.discount,
            total=inv.total,
            payment_mode=inv.payment_mode,
            status=inv.status,
            notes=inv.notes,
            due_date=inv.due_date,
            created_at=inv.created_at,
        ))
    return result

@router.put("/api/invoices/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.store_id == current_user.store_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = new_status
    db.commit()
    return {"message": f"Invoice {invoice.invoice_number} status updated to {new_status}"}

@router.get("/api/invoices/summary")
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(Invoice.store_id == current_user.store_id).all()
    return {
        "total_invoices":   len(invoices),
        "total_billed":     round(sum(i.total for i in invoices), 2),
        "paid":             len([i for i in invoices if i.status == "Paid"]),
        "pending":          len([i for i in invoices if i.status == "Pending"]),
        "overdue":          len([i for i in invoices if i.status == "Overdue"]),
        "pending_amount":   round(sum(i.total for i in invoices if i.status == "Pending"), 2),
        "overdue_amount":   round(sum(i.total for i in invoices if i.status == "Overdue"), 2),
    }

# ── PURCHASES ─────────────────────────────────────────

@router.post("/api/purchases", response_model=PurchaseResponse, status_code=201)
def create_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    purchase_date = datetime.fromisoformat(data.date) if data.date else datetime.now()
    purchase = Purchase(
        store_id=current_user.store_id,
        supplier=data.supplier,
        category=data.category,
        description=data.description,
        amount=data.amount,
        payment_mode=data.payment_mode,
        status=data.status,
        date=purchase_date,
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase

@router.get("/api/purchases", response_model=List[PurchaseResponse])
def get_purchases(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Purchase).filter(Purchase.store_id == current_user.store_id)
    if category:
        query = query.filter(Purchase.category == category)
    if status_filter:
        query = query.filter(Purchase.status == status_filter)
    return query.order_by(Purchase.date.desc()).limit(limit).all()

@router.get("/api/purchases/summary")
def get_purchase_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    purchases = db.query(Purchase).filter(Purchase.store_id == current_user.store_id).all()
    by_category = {}
    for p in purchases:
        by_category[p.category] = by_category.get(p.category, 0) + p.amount

    return {
        "total_purchases":  len(purchases),
        "total_spent":      round(sum(p.amount for p in purchases), 2),
        "paid":             len([p for p in purchases if p.status == "Paid"]),
        "pending":          len([p for p in purchases if p.status == "Pending"]),
        "pending_amount":   round(sum(p.amount for p in purchases if p.status == "Pending"), 2),
        "by_category":      {k: round(v, 2) for k, v in by_category.items()},
    }
