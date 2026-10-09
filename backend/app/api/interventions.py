"""Interventions API — list, approve, outcome tracking."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.security import require_any, require_faculty_up
from app.schemas.auth import TokenData
from app.core.database import get_db

router = APIRouter()

class ApproveRequest(BaseModel):
    studentId:      str
    interventionId: str
    notes:          Optional[str] = None

class OutcomeRequest(BaseModel):
    afterMetrics:    dict
    observedImpact:  Optional[str] = None

@router.get("")
async def list_interventions(
    dept: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    perPage: int = Query(30),
    current_user: TokenData = Depends(require_any),
):
    """Return priority intervention queue — students needing action."""
    db = await get_db()
    flt = {}
    if dept: flt["department"] = dept
    flt["riskLevel"] = {"$in": ["at_risk","critical"]}

    students = await db.students.find(flt, {
        "studentId":1,"name":1,"department":1,"riskLevel":1,"riskProbability":1,
        "successIndex":1,"momentum":1,"recoveryPotential":1,"recoveryLabel":1,
        "recommendedInterventions":1,"shapDrivers":1,"_id":0
    }).sort("riskProbability", -1).limit(50).to_list(50)

    return {"students": students, "total": len(students)}


@router.post("/approve")
async def approve_intervention(
    req: ApproveRequest,
    current_user: TokenData = Depends(require_faculty_up),
):
    """Approve a recommended intervention for a student."""
    db = await get_db()
    result = await db.interventions.update_one(
        {"studentId": req.studentId, "interventionId": req.interventionId},
        {"$set": {
            "status": "APPROVED",
            "approvedBy": current_user.name,
            "approvedAt": datetime.now(timezone.utc).isoformat(),
            "notes": req.notes,
        }},
        upsert=True,
    )
    # Audit log
    await db.audit_logs.insert_one({
        "action": "APPROVE_INTERVENTION",
        "userId": current_user.userId,
        "userName": current_user.name,
        "targetStudentId": req.studentId,
        "interventionId": req.interventionId,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "message": "Intervention approved successfully"}


@router.post("/{intervention_id}/outcome")
async def record_outcome(
    intervention_id: str,
    req: OutcomeRequest,
    current_user: TokenData = Depends(require_faculty_up),
):
    """Record before→after outcome for an approved intervention."""
    db = await get_db()
    await db.interventions.update_one(
        {"interventionId": intervention_id},
        {"$set": {
            "afterMetrics":   req.afterMetrics,
            "observedImpact": req.observedImpact,
            "completedAt":    datetime.now(timezone.utc).isoformat(),
            "status":         "COMPLETED",
        }}
    )
    return {"ok": True, "message": "Outcome recorded"}
