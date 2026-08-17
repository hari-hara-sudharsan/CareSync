from pydantic import BaseModel, Field
from typing import Optional

class OTPRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15552345678"})

class OTPVerify(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15552345678"})
    otp_code: str = Field(..., json_schema_extra={"example": "123456"})

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str

class UserCreate(BaseModel):
    phone: str
    full_name: str
    email: Optional[str] = None
    role: str = "FAMILY"

class UserRead(BaseModel):
    id: str
    phone: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True
