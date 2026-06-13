"""
Pydantic models for User authentication.
"""
import re
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List


INDIAN_PHONE_RE = re.compile(r'^(\+91)?[6-9]\d{9}$')


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=254)
    phone: str = Field(...)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not INDIAN_PHONE_RE.match(v):
            raise ValueError('Enter a valid 10-digit Indian mobile number starting with 6-9')
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Basic RFC5321 check
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Enter a valid email address')
        return v.lower().strip()

    @model_validator(mode='after')
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or Indian phone number")
    password: str = Field(...)
    remember_me: bool = False


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str


class UserPublic(BaseModel):
    user_id: str
    name: str
    email: str
    phone: str
    green_credits: int = 0
