from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.models import Customer, KhataEntry, User
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    KhataEntryCreate, KhataEntryResponse
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/customers", tags=["Customers & Khata"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    segment: Optional[str] = Query(None),
    city: Optional[str]    = Query(None),
    search: Optional[str]  = Query(None),
    has_credit: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer).filter(
        Customer.store_id == current_user.store_id,
        Customer.is_active == True
    )
    if segment:
        query = query.filter(Customer.segment == segment)
    if city:
        query = query.filter(Customer.city == city)
    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search}%") |
            Customer.phone.ilike(f"%{search}%")
        )
    if has_credit is True:
        query = query.filter(Customer.outstanding_credit > 0)

    return query.order_by(Customer.name).all()

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = Customer(
        store_id=current_user.store_id,
        name=data.name,
        phone=data.phone,
        city=data.city,
        segment=data.segment,
        credit_limit=data.credit_limit,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/summary")
def get_customers_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customers = db.query(Customer).filter(
        Customer.store_id == current_user.store_id,
        Customer.is_active == True
    ).all()

    total_credit     = sum(c.outstanding_credit for c in customers)
    credit_customers = [c for c in customers if c.outstanding_credit > 0]
    overdue          = [c for c in customers if c.credit_days > 30]

    return {
        "total_customers":      len(customers),
        "total_outstanding":    round(total_credit, 2),
        "customers_with_credit":len(credit_customers),
        "overdue_customers":    len(overdue),
        "overdue_amount":       round(sum(c.outstanding_credit for c in overdue), 2),
        "segments": {
            "walk_in":   len([c for c in customers if c.segment == "Walk-in"]),
            "wholesale": len([c for c in customers if c.segment == "Wholesale"]),
            "credit":    len([c for c in customers if c.segment == "Credit"]),
        }
    }

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.store_id == current_user.store_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.store_id == current_user.store_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.store_id == current_user.store_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_active = False
    db.commit()
    return {"message": f"Customer '{customer.name}' deleted successfully"}

# ── KHATA ROUTES ─────────────────────────────────────

@router.post("/khata/entry", response_model=KhataEntryResponse)
def add_khata_entry(
    data: KhataEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == data.customer_id,
        Customer.store_id == current_user.store_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Update outstanding credit
    if data.type == "Credit Given":
        customer.outstanding_credit += data.amount
        customer.credit_days = 0
    elif data.type == "Payment Received":
        customer.outstanding_credit = max(0, customer.outstanding_credit - data.amount)

    entry = KhataEntry(
        store_id=current_user.store_id,
        customer_id=data.customer_id,
        type=data.type,
        amount=data.amount,
        description=data.description,
        status=data.status,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    response = KhataEntryResponse(
        id=entry.id,
        store_id=entry.store_id,
        customer_id=entry.customer_id,
        customer_name=customer.name,
        type=entry.type,
        amount=entry.amount,
        description=entry.description,
        status=entry.status,
        date=entry.date,
        created_at=entry.created_at,
    )
    return response

@router.get("/khata/all", response_model=List[KhataEntryResponse])
def get_all_khata(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(KhataEntry).filter(
        KhataEntry.store_id == current_user.store_id
    )
    if status_filter:
        query = query.filter(KhataEntry.status == status_filter)

    entries = query.order_by(KhataEntry.date.desc()).all()

    result = []
    for entry in entries:
        customer = db.query(Customer).filter(Customer.id == entry.customer_id).first()
        result.append(KhataEntryResponse(
            id=entry.id,
            store_id=entry.store_id,
            customer_id=entry.customer_id,
            customer_name=customer.name if customer else "Unknown",
            type=entry.type,
            amount=entry.amount,
            description=entry.description,
            status=entry.status,
            date=entry.date,
            created_at=entry.created_at,
        ))
    return result

@router.get("/{customer_id}/khata", response_model=List[KhataEntryResponse])
def get_customer_khata(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.store_id == current_user.store_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    entries = db.query(KhataEntry).filter(
        KhataEntry.customer_id == customer_id
    ).order_by(KhataEntry.date.desc()).all()

    return [KhataEntryResponse(
        id=e.id,
        store_id=e.store_id,
        customer_id=e.customer_id,
        customer_name=customer.name,
        type=e.type,
        amount=e.amount,
        description=e.description,
        status=e.status,
        date=e.date,
        created_at=e.created_at,
    ) for e in entries]

@router.put("/khata/{entry_id}/status")
def update_khata_status(
    entry_id: int,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(KhataEntry).filter(
        KhataEntry.id == entry_id,
        KhataEntry.store_id == current_user.store_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Khata entry not found")
    entry.status = new_status
    db.commit()
    return {"message": f"Status updated to {new_status}"}
