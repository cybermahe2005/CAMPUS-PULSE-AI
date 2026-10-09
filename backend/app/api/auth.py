"""API Router — Authentication with all roles and responsibilities."""
from fastapi import APIRouter, HTTPException, Depends, status
from app.core.security import create_access_token, get_current_user
from app.core.database import get_db
from app.schemas.auth import Token, LoginRequest, UserInfo, UserRole, TokenData

router = APIRouter()

# ── Demo user registry ─────────────────────────────────────────────────────────
# In production: replace with database-backed user accounts with hashed passwords
DEMO_USERS = {
    # ── Administrators ─────────────────────────────────────────────────────────
    "admin":      {"name":"Dr. Meenakshi Patel",      "role":UserRole.ADMIN,             "department":None,                "password":"admin123",    "email":"admin@campus.edu"},
    "demo":       {"name":"Demo Admin",               "role":UserRole.ADMIN,             "department":None,                "password":"demo",         "email":"demo@campus.edu"},

    # ── Institution Leadership ─────────────────────────────────────────────────
    "js":         {"name":"Mr. Arjun Mehta",          "role":UserRole.JOINT_SECRETARY,   "department":None,                "password":"js123",        "email":"js@campus.edu",          "responsibilities":["INSTITUTION_ANALYTICS","ROLE_MANAGEMENT"]},
    "principal":  {"name":"Dr. Sunita Krishnan",      "role":UserRole.PRINCIPAL,         "department":None,                "password":"principal123", "email":"principal@campus.edu",   "responsibilities":["INSTITUTION_MONITORING"]},

    # ── HODs ────────────────────────────────────────────────────────────────────
    "hod":        {"name":"Prof. Rajan Sharma",       "role":UserRole.HOD,               "department":"Computer Science",  "password":"hod123",       "email":"hod.cs@campus.edu"},
    "hod_ec":     {"name":"Prof. Kavitha Reddy",      "role":UserRole.HOD,               "department":"Electronics",       "password":"hod123",       "email":"hod.ec@campus.edu"},
    "hod_me":     {"name":"Prof. Suresh Babu",        "role":UserRole.HOD,               "department":"Mechanical",        "password":"hod123",       "email":"hod.me@campus.edu"},

    # ── Faculty (base role + responsibilities) ──────────────────────────────────
    "faculty":    {"name":"Ms. Priya Nair",           "role":UserRole.FACULTY,           "department":"Computer Science",  "password":"faculty123",   "email":"faculty@campus.edu",     "responsibilities":["CLASS_ADVISOR"], "classIds":["CSE-A-2027"]},
    "mentor":     {"name":"Mr. Deepak Sharma",        "role":UserRole.FACULTY,           "department":"Computer Science",  "password":"mentor123",    "email":"mentor@campus.edu",      "responsibilities":["MENTOR"],        "menteeIds":["STU001","STU002","STU003"]},
    "advisor":    {"name":"Ms. Lakshmi Iyer",         "role":UserRole.FACULTY,           "department":"Electronics",       "password":"advisor123",   "email":"advisor@campus.edu",     "responsibilities":["CLASS_ADVISOR"], "classIds":["ECE-A-2027"]},

    # ── Placement Team ──────────────────────────────────────────────────────────
    "placement":  {"name":"Mr. Vikram Gupta",         "role":UserRole.PLACEMENT_OFFICER, "department":None,                "password":"placement123", "email":"placement@campus.edu"},
    "placement_cs":{"name":"Ms. Meena Joshi",         "role":UserRole.PLACEMENT_OFFICER, "department":"Computer Science",  "password":"placement123", "email":"placement.cs@campus.edu"},

    # ── Student Accounts (userId → real studentId in DB) ────────────────────────
    # STU001: Eligible student (CSE, good CGPA, no arrears)
    "student":    {"name":"Arun Kumar",               "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"student123",   "email":"stu001@campus.edu",  "userId":"STU001"},
    "stu001":     {"name":"Arun Kumar",               "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"stu001",        "email":"stu001@campus.edu",  "userId":"STU001"},
    # STU002: Student with current arrears (should fail current_arrears=0 jobs)
    "stu002":     {"name":"Priya Devi",               "role":UserRole.STUDENT,           "department":"Electronics",       "password":"stu002",        "email":"stu002@campus.edu",  "userId":"STU002"},
    # STU003: Ineligible stream (Mechanical for CS-only jobs)
    "stu003":     {"name":"Ravi Shankar",             "role":UserRole.STUDENT,           "department":"Mechanical",        "password":"stu003",        "email":"stu003@campus.edu",  "userId":"STU003"},
    # STU004: Student with historical arrears
    "stu004":     {"name":"Lakshmi Reddy",            "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"stu004",        "email":"stu004@campus.edu",  "userId":"STU004"},
    # STU005: Low CGPA
    "stu005":     {"name":"Rahul Patel",              "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"stu005",        "email":"stu005@campus.edu",  "userId":"STU005"},
    # STU006: Missing academic data (ELIGIBILITY_UNKNOWN scenario)
    "stu006":     {"name":"Ananya Singh",             "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"stu006",        "email":"stu006@campus.edu",  "userId":"STU006"},

    # ── Class Representative ────────────────────────────────────────────────────
    "cr001":      {"name":"Siddharth Joshi",          "role":UserRole.STUDENT,           "department":"Computer Science",  "password":"cr001",         "email":"cr001@campus.edu",   "userId":"STU_CR001", "responsibilities":["CLASS_REPRESENTATIVE"]},
}


@router.post("/login", response_model=Token, summary="Authenticate and get JWT token")
async def login(request: LoginRequest):
    user = DEMO_USERS.get(request.username.lower())
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    uid              = user.get("userId", request.username.lower())
    responsibilities = user.get("responsibilities", [])
    class_ids        = user.get("classIds", [])
    mentee_ids       = user.get("menteeIds", [])

    token_data = {
        "sub":              uid,
        "role":             user["role"].value,
        "department":       user["department"],
        "name":             user["name"],
        "responsibilities": responsibilities,
        "classIds":         class_ids,
        "menteeIds":        mentee_ids,
    }
    access_token = create_access_token(token_data)
    return Token(
        access_token=access_token,
        user=UserInfo(
            userId=uid,
            name=user["name"],
            role=user["role"],
            department=user["department"],
            email=user["email"],
        ),
    )


@router.get("/me", response_model=UserInfo, summary="Get current user info")
async def me(current_user: TokenData = Depends(get_current_user)):
    return UserInfo(
        userId=current_user.userId,
        name=current_user.name,
        role=current_user.role,
        department=current_user.department,
    )


@router.get("/users", summary="List all demo users (admin only)")
async def list_users(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return [
        {
            "username":        uname,
            "name":            u["name"],
            "role":            u["role"].value,
            "department":      u.get("department"),
            "responsibilities":u.get("responsibilities", []),
            "email":           u.get("email"),
        }
        for uname, u in DEMO_USERS.items()
    ]
