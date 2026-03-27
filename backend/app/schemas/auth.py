from pydantic import BaseModel, EmailStr
from typing import Optional

class StoreCreate(BaseModel):
    name: str
    city: str
    address: Optional[str] = None
    phone: Optional[str] = None

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    store: StoreCreate

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    user_role: str
    store_id: int
    store_name: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    store_id: int
    store_name: str

    class Config:
        from_attributes = True
