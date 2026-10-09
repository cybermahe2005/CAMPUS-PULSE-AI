"""Students API — list, detail, RBAC scoping."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import math
from app.core.security import get_current_user, require_any, require_authenticated
from app.schemas.auth import TokenData, UserRole
from app.core.database import get_db

router = APIRouter()

def scope_filter(user: TokenData) -> dict:
    if user.role == UserRole.HOD and user.department:
        return {"department": user.department}
    if user.role == UserRole.FACULTY and user.department:
        return {"department": user.department}
    return {}

@router.get("")
async def list_students(
    q:          Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    riskLevel:  Optional[str] = Query(None),
    momentum:   Optional[str] = Query(None),
    segment:    Optional[str] = Query(None),
    sortBy:     str           = Query("successIndex"),
    sortAsc:    bool          = Query(False),
    page:       int           = Query(1, ge=1),
    perPage:    int           = Query(30, ge=1, le=100),
    current_user: TokenData   = Depends(require_any),
):
    db = await get_db()
    flt = scope_filter(current_user)

    if department: flt["department"] = department
    if riskLevel:  flt["riskLevel"]  = riskLevel
    if momentum:   flt["momentum"]   = momentum
    if segment:    flt["segment"]    = segment
    if q:
        flt["$or"] = [
            {"name":       {"$regex": q, "$options":"i"}},
            {"studentId":  {"$regex": q, "$options":"i"}},
            {"department": {"$regex": q, "$options":"i"}},
        ]

    total  = await db.students.count_documents(flt)
    pages  = math.ceil(total / perPage)
    skip   = (page-1) * perPage
    sort_d = 1 if sortAsc else -1

    SUMMARY_FIELDS = {
        "studentId":1,"name":1,"email":1,"department":1,"semester":1,"rollNo":1,
        "cgpa":1,"attendancePct":1,"codingScore":1,"aptitudeScore":1,
        "mockInterviewScore":1,"lmsConsistency":1,
        "successIndex":1,"academicReadiness":1,"placementReadiness":1,"engagementHealth":1,
        "riskProbability":1,"riskLevel":1,"momentum":1,"riskVelocity":1,
        "recoveryPotential":1,"recoveryLabel":1,"segment":1,"segmentLabel":1,
        "dataConfidence":1,"backlogCount":1,"_id":0
    }
    students = await db.students.find(flt, SUMMARY_FIELDS).sort(sortBy, sort_d).skip(skip).limit(perPage).to_list(perPage)

    return {"students": students, "total": total, "page": page, "perPage": perPage, "pages": pages}


@router.get("/{student_id}")
async def get_student(student_id: str, current_user: TokenData = Depends(require_authenticated)):
    db = await get_db()
    # STUDENT role: self-only access (prevents IDOR)
    if current_user.role == UserRole.STUDENT and student_id != current_user.userId:
        raise HTTPException(status_code=403, detail="Students can only view their own profile")
    flt = {**scope_filter(current_user), "studentId": student_id}
    student = await db.students.find_one(flt, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return student
