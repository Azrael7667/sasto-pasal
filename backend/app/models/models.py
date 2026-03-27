from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class UserRole(str, enum.Enum):
    owner   = "owner"
    manager = "manager"
    cashier = "cashier"

class PaymentMode(str, enum.Enum):
    cash     = "Cash"
    esewa    = "Esewa"
    khalti   = "Khalti"
    credit   = "Credit"
    bank     = "Bank Transfer"

class Store(Base):
    __tablename__ = "stores"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    city       = Column(String, nullable=False)
    address    = Column(String)
    phone      = Column(String)
    pan_number = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users      = relationship("User",        back_populates="store")
    products   = relationship("Product",     back_populates="store")
    customers  = relationship("Customer",    back_populates="store")
    employees  = relationship("Employee",    back_populates="store")
    transactions = relationship("Transaction", back_populates="store")
    purchases  = relationship("Purchase",    back_populates="store")

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    store_id      = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    phone         = Column(String)
    password_hash = Column(String, nullable=False)
    role          = Column(String, default="cashier")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    store         = relationship("Store", back_populates="users")

class Product(Base):
    __tablename__ = "products"
    id            = Column(Integer, primary_key=True, index=True)
    store_id      = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name          = Column(String, nullable=False)
    category      = Column(String, nullable=False)
    sku           = Column(String)
    sell_price    = Column(Float, nullable=False)
    cost_price    = Column(Float, nullable=False)
    current_stock = Column(Float, default=0)
    reorder_point = Column(Float, default=20)
    daily_demand  = Column(Float, default=1)
    unit          = Column(String, default="pcs")
    supplier      = Column(String)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    store         = relationship("Store", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product")

class Customer(Base):
    __tablename__ = "customers"
    id                 = Column(Integer, primary_key=True, index=True)
    store_id           = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name               = Column(String, nullable=False)
    phone              = Column(String)
    city               = Column(String)
    segment            = Column(String, default="Walk-in")
    outstanding_credit = Column(Float, default=0)
    credit_limit       = Column(Float, default=10000)
    credit_days        = Column(Integer, default=0)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    store              = relationship("Store",       back_populates="customers")
    khata_entries      = relationship("KhataEntry",  back_populates="customer")
    transactions       = relationship("Transaction", back_populates="customer")
    invoices           = relationship("Invoice",     back_populates="customer")

class KhataEntry(Base):
    __tablename__ = "khata_entries"
    id          = Column(Integer, primary_key=True, index=True)
    store_id    = Column(Integer, ForeignKey("stores.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    type        = Column(String, nullable=False)
    amount      = Column(Float, nullable=False)
    description = Column(Text)
    status      = Column(String, default="Pending")
    date        = Column(DateTime(timezone=True), server_default=func.now())
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    customer    = relationship("Customer", back_populates="khata_entries")

class Transaction(Base):
    __tablename__ = "transactions"
    id           = Column(Integer, primary_key=True, index=True)
    store_id     = Column(Integer, ForeignKey("stores.id"), nullable=False)
    customer_id  = Column(Integer, ForeignKey("customers.id"), nullable=True)
    type         = Column(String, default="sale")
    subtotal     = Column(Float, nullable=False)
    discount     = Column(Float, default=0)
    total        = Column(Float, nullable=False)
    payment_mode = Column(String, default="Cash")
    notes        = Column(Text)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    store        = relationship("Store",       back_populates="transactions")
    customer     = relationship("Customer",    back_populates="transactions")
    items        = relationship("TransactionItem", back_populates="transaction")

class TransactionItem(Base):
    __tablename__ = "transaction_items"
    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    product_id     = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity       = Column(Float, nullable=False)
    unit_price     = Column(Float, nullable=False)
    total_price    = Column(Float, nullable=False)

    transaction    = relationship("Transaction", back_populates="items")

class Invoice(Base):
    __tablename__ = "invoices"
    id             = Column(Integer, primary_key=True, index=True)
    store_id       = Column(Integer, ForeignKey("stores.id"), nullable=False)
    customer_id    = Column(Integer, ForeignKey("customers.id"), nullable=True)
    invoice_number = Column(String, unique=True, nullable=False)
    subtotal       = Column(Float, nullable=False)
    discount       = Column(Float, default=0)
    total          = Column(Float, nullable=False)
    payment_mode   = Column(String, default="Cash")
    status         = Column(String, default="Pending")
    due_date       = Column(DateTime(timezone=True))
    notes          = Column(Text)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    customer       = relationship("Customer", back_populates="invoices")

class Purchase(Base):
    __tablename__ = "purchases"
    id           = Column(Integer, primary_key=True, index=True)
    store_id     = Column(Integer, ForeignKey("stores.id"), nullable=False)
    supplier     = Column(String)
    category     = Column(String)
    description  = Column(Text)
    amount       = Column(Float, nullable=False)
    payment_mode = Column(String, default="Cash")
    status       = Column(String, default="Paid")
    date         = Column(DateTime(timezone=True), server_default=func.now())
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    store        = relationship("Store", back_populates="purchases")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id         = Column(Integer, primary_key=True, index=True)
    store_id   = Column(Integer, ForeignKey("stores.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    type       = Column(String, nullable=False)
    quantity   = Column(Float, nullable=False)
    reason     = Column(String)
    notes      = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product    = relationship("Product", back_populates="stock_movements")

class Employee(Base):
    __tablename__ = "employees"
    id                = Column(Integer, primary_key=True, index=True)
    store_id          = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name              = Column(String, nullable=False)
    phone             = Column(String)
    city              = Column(String)
    department        = Column(String)
    salary            = Column(Float)
    tenure_months     = Column(Integer, default=0)
    overtime_hours    = Column(Float, default=0)
    absenteeism_days  = Column(Integer, default=0)
    satisfaction_score= Column(Float, default=3.0)
    promotions        = Column(Integer, default=0)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    store             = relationship("Store", back_populates="employees")

class AIPrediction(Base):
    __tablename__ = "ai_predictions"
    id               = Column(Integer, primary_key=True, index=True)
    store_id         = Column(Integer, ForeignKey("stores.id"), nullable=False)
    model_type       = Column(String, nullable=False)
    entity_id        = Column(Integer)
    entity_type      = Column(String)
    prediction_value = Column(Float)
    prediction_label = Column(String)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
