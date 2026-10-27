from pydantic import BaseModel, Field
from typing import Optional, Literal

# Roles a person may choose for themselves at public signup. COORDINATOR and ADMIN are never
# self-selectable: they are granted through audited administrative provisioning only.
SelfSelectableRole = Literal["PARENT", "FAMILY", "VOLUNTEER"]

class OTPRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15552345678"})

class OTPVerify(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15552345678"})
    otp_code: str = Field(..., json_schema_extra={"example": "123456"})
    # Only honoured when this verification creates a new account; ignored for existing users.
    requested_role: Optional[SelfSelectableRole] = None

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
