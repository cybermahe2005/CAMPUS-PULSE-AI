"""JWT authentication and RBAC utilities."""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.schemas.auth import TokenData, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str          = payload.get("sub")
        role: str             = payload.get("role", "STUDENT")
        department: Optional[str] = payload.get("department")
        name: str             = payload.get("name", "")
        responsibilities: list = payload.get("responsibilities", [])
        class_ids: list        = payload.get("classIds", [])
        mentee_ids: list       = payload.get("menteeIds", [])
        if user_id is None:
            raise credentials_exception
        return TokenData(
            userId=user_id,
            role=UserRole(role),
            department=department,
            name=name,
            responsibilities=responsibilities,
            classIds=class_ids,
            menteeIds=mentee_ids,
        )
    except JWTError:
        raise credentials_exception


def require_roles(allowed_roles: List[UserRole]):
    """Dependency factory for role-based access control."""
    async def checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return checker


# Convenience role guards
require_admin          = require_roles([UserRole.ADMIN])
require_institution    = require_roles([UserRole.ADMIN, UserRole.JOINT_SECRETARY, UserRole.PRINCIPAL])
require_hod_up         = require_roles([UserRole.ADMIN, UserRole.JOINT_SECRETARY, UserRole.PRINCIPAL, UserRole.HOD])
require_faculty_up     = require_roles([UserRole.ADMIN, UserRole.JOINT_SECRETARY, UserRole.PRINCIPAL, UserRole.HOD, UserRole.FACULTY])
require_placement      = require_roles([UserRole.ADMIN, UserRole.PLACEMENT_OFFICER])
require_any            = require_roles([UserRole.ADMIN, UserRole.JOINT_SECRETARY, UserRole.PRINCIPAL,
                                        UserRole.HOD, UserRole.FACULTY, UserRole.PLACEMENT_OFFICER])
# All authenticated users (including STUDENT)
require_authenticated  = require_roles([UserRole.ADMIN, UserRole.JOINT_SECRETARY, UserRole.PRINCIPAL,
                                        UserRole.HOD, UserRole.FACULTY, UserRole.PLACEMENT_OFFICER,
                                        UserRole.STUDENT])
