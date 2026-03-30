from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    display_name: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user response."""
    id: uuid.UUID
    email: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
