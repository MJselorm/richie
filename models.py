from pydantic import BaseModel, EmailStr
from typing import Optional


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    student_id: Optional[str] = None
    program: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    phone: Optional[str] = None
