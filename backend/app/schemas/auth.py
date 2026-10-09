"""Pydantic schemas — Auth and Token models."""
from pydantic import BaseModel
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    # Institution leadership
    ADMIN              = "ADMIN"               # system administrator (super)
    JOINT_SECRETARY    = "JOINT_SECRETARY"      # institution-wide analytics, role mgmt
    PRINCIPAL          = "PRINCIPAL"            # institution-wide oversight
    # Department
    HOD                = "HOD"                  # own-department scope
    # Faculty (base role — responsibilities added separately)
    FACULTY            = "FACULTY"
    # Placement team
    PLACEMENT_OFFICER  = "PLACEMENT_OFFICER"    # institution or dept placement scope
    # Students
    STUDENT            = "STUDENT"


class FacultyResponsibility(str, Enum):
    CLASS_ADVISOR          = "CLASS_ADVISOR"
    MENTOR                 = "MENTOR"
    PLACEMENT_COORDINATOR  = "PLACEMENT_COORDINATOR"


class StudentResponsibility(str, Enum):
    CLASS_REPRESENTATIVE = "CLASS_REPRESENTATIVE"


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    userId: str
    name: str
    role: UserRole
    department: Optional[str] = None
    email: Optional[str] = None


class TokenData(BaseModel):
    userId: str
    role: UserRole
    department: Optional[str] = None
    name: str = ""
    responsibilities: list = []   # e.g. ["CLASS_ADVISOR", "PLACEMENT_COORDINATOR"]
    classIds: list = []           # assigned class IDs (CLASS_ADVISOR)
    menteeIds: list = []          # assigned student IDs (MENTOR)


Token.model_rebuild()
