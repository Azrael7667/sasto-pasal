from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.db.base import get_db
from app.models.models import (
    Transaction, TransactionItem, Product,
    Customer, Employee, Invoice, Purchase,
    KhataEntry, User
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    store_id = current_user.store_id
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end   = datetime.combine(date.today(), datetime.max.time())
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0)

    # Today's transactions
    today_txns = db.query(Transaction).filter(
        Transaction.store_id == store_id,
        Transaction.created_at >= today_start,
        Transaction.created_at <= today_end,
    ).all()

    # Monthly transactions
    month_txns = db.query(Transaction).filter(
        Transaction.store_id == store_id,
        Transaction.created_at >= month_start,
    ).all()

    # Products
    products = db.query(Product).filter(
        Product.store_id == store_id,
        Product.is_active == True
    ).all()

    def days_of_stock(p):
        return p.current_stock / p.daily_demand if p.daily_demand > 0 else 0

    critical = [p for p in products if days_of_stock(p) < 7]
    warning  = [p for p in products if 7 <= days_of_stock(p) < 14]

    # Customers
    customers = db.query(Customer).filter(
        Customer.store_id == store_id,
        Customer.is_active == True
    ).all()
    total_udharo  = sum(c.outstanding_credit for c in customers)
    overdue_custs = [c for c in customers if c.credit_days > 30]

    # Invoices
    invoices = db.query(Invoice).filter(Invoice.store_id == store_id).all()
    pending_invoices = [i for i in invoices if i.status == "Pending"]

    # Today profit calculation
    today_profit = 0
    for txn in today_txns:
        items = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == txn.id
        ).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                today_profit += (item.unit_price - product.cost_price) * item.quantity

    # Monthly profit
    month_profit = 0
    for txn in month_txns:
        items = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == txn.id
        ).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                month_profit += (item.unit_price - product.cost_price) * item.quantity

    return {
        "today": {
            "revenue":      round(sum(t.total for t in today_txns), 2),
            "profit":       round(today_profit, 2),
            "transactions": len(today_txns),
            "cash_sales":   round(sum(t.total for t in today_txns if t.payment_mode == "Cash"), 2),
            "credit_sales": round(sum(t.total for t in today_txns if t.payment_mode == "Credit"), 2),
            "digital_sales":round(sum(t.total for t in today_txns if t.payment_mode in ["Esewa","Khalti","Bank Transfer"]), 2),
        },
        "monthly": {
            "revenue":      round(sum(t.total for t in month_txns), 2),
            "profit":       round(month_profit, 2),
            "transactions": len(month_txns),
        },
        "inventory": {
            "total_products":   len(products),
            "critical_count":   len(critical),
            "warning_count":    len(warning),
            "ok_count":         len(products) - len(critical) - len(warning),
            "total_stock_value":round(sum(p.current_stock * p.sell_price for p in products), 2),
            "critical_items":   [{"id": p.id, "name": p.name} for p in critical[:5]],
        },
        "customers": {
            "total":            len(customers),
            "total_udharo":     round(total_udharo, 2),
            "overdue_count":    len(overdue_custs),
            "overdue_amount":   round(sum(c.outstanding_credit for c in overdue_custs), 2),
        },
        "invoices": {
            "total":            len(invoices),
            "pending_count":    len(pending_invoices),
            "pending_amount":   round(sum(i.total for i in pending_invoices), 2),
        },
        "alerts": {
            "critical_stock":   [{"id": p.id, "name": p.name, "days_left": round(days_of_stock(p), 1)} for p in critical],
            "low_stock":        [{"id": p.id, "name": p.name, "days_left": round(days_of_stock(p), 1)} for p in warning[:5]],
            "overdue_udharo":   [{"id": c.id, "name": c.name, "amount": c.outstanding_credit} for c in overdue_custs[:5]],
            "pending_invoices": [{"id": i.id, "number": i.invoice_number, "amount": i.total} for i in pending_invoices[:5]],
        }
    }

@router.get("/health-score")
def get_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    store_id = current_user.store_id
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0)

    # Financial score
    month_txns = db.query(Transaction).filter(
        Transaction.store_id == store_id,
        Transaction.created_at >= month_start,
    ).all()
    month_revenue = sum(t.total for t in month_txns)
    month_profit  = 0
    for txn in month_txns:
        items = db.query(TransactionItem).filter(TransactionItem.transaction_id == txn.id).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                month_profit += (item.unit_price - product.cost_price) * item.quantity
    margin = (month_profit / month_revenue * 100) if month_revenue > 0 else 0
    financial_score = min(100, max(0, int(margin * 2.5)))

    # Inventory score
    products = db.query(Product).filter(
        Product.store_id == store_id, Product.is_active == True
    ).all()
    def dos(p): return p.current_stock / p.daily_demand if p.daily_demand > 0 else 0
    critical_count = len([p for p in products if dos(p) < 7])
    inventory_score = max(0, int(100 - (critical_count / max(len(products), 1)) * 100))

    # Customer score
    customers = db.query(Customer).filter(
        Customer.store_id == store_id, Customer.is_active == True
    ).all()
    overdue = len([c for c in customers if c.credit_days > 30])
    customer_score = max(0, int(100 - (overdue / max(len(customers), 1)) * 100))

    # Workforce score
    employees = db.query(Employee).filter(Employee.store_id == store_id).all()
    if employees:
        avg_satisfaction = sum(e.satisfaction_score for e in employees) / len(employees)
        workforce_score = min(100, int(avg_satisfaction * 20))
    else:
        workforce_score = 75

    # Composite health score
    health_score = int(
        financial_score  * 0.30 +
        inventory_score  * 0.25 +
        customer_score   * 0.25 +
        workforce_score  * 0.20
    )

    return {
        "health_score":    health_score,
        "financial_score": financial_score,
        "inventory_score": inventory_score,
        "customer_score":  customer_score,
        "workforce_score": workforce_score,
        "status": "Healthy" if health_score >= 70 else ("Warning" if health_score >= 40 else "Critical"),
        "breakdown": {
            "financial":  {"score": financial_score,  "weight": "30%", "metric": f"{margin:.1f}% profit margin"},
            "inventory":  {"score": inventory_score,  "weight": "25%", "metric": f"{critical_count} critical items"},
            "customer":   {"score": customer_score,   "weight": "25%", "metric": f"{overdue} overdue accounts"},
            "workforce":  {"score": workforce_score,  "weight": "20%", "metric": f"{avg_satisfaction:.1f}/5 satisfaction" if employees else "No data"},
        }
    }

@router.get("/profit-loss")
def get_profit_loss(
    period: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    store_id = current_user.store_id
    if period == "weekly":
        start = datetime.now() - timedelta(days=7)
    elif period == "monthly":
        start = datetime.now().replace(day=1, hour=0, minute=0, second=0)
    elif period == "yearly":
        start = datetime.now().replace(month=1, day=1, hour=0, minute=0, second=0)
    else:
        start = datetime.now().replace(day=1, hour=0, minute=0, second=0)

    txns = db.query(Transaction).filter(
        Transaction.store_id == store_id,
        Transaction.created_at >= start,
    ).all()
    purchases = db.query(Purchase).filter(
        Purchase.store_id == store_id,
        Purchase.date >= start,
    ).all()

    revenue = sum(t.total for t in txns)
    cogs    = 0
    for txn in txns:
        items = db.query(TransactionItem).filter(TransactionItem.transaction_id == txn.id).all()
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                cogs += product.cost_price * item.quantity

    gross_profit    = revenue - cogs
    total_expenses  = sum(p.amount for p in purchases)
    net_profit      = gross_profit - total_expenses
    gross_margin    = (gross_profit / revenue * 100) if revenue > 0 else 0
    net_margin      = (net_profit   / revenue * 100) if revenue > 0 else 0

    return {
        "period":           period,
        "revenue":          round(revenue, 2),
        "cogs":             round(cogs, 2),
        "gross_profit":     round(gross_profit, 2),
        "gross_margin":     round(gross_margin, 1),
        "total_expenses":   round(total_expenses, 2),
        "net_profit":       round(net_profit, 2),
        "net_margin":       round(net_margin, 1),
        "expense_breakdown":{p.category: round(sum(x.amount for x in purchases if x.category == p.category), 2)
                             for p in purchases},
    }
