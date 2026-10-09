"""Predictions API stub."""
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_any
from app.schemas.auth import TokenData
from app.core.database import get_db

router = APIRouter()

@router.get("/{student_id}")
async def get_predictions(student_id: str, current_user: TokenData = Depends(require_any)):
    db = await get_db()
    student = await db.students.find_one({"studentId": student_id},
        {"successIndex":1,"riskProbability":1,"riskLevel":1,"placementReadiness":1,
         "academicReadiness":1,"engagementHealth":1,"momentum":1,"riskVelocity":1,
         "recoveryPotential":1,"recoveryLabel":1,"dataConfidence":1,
         "componentScores":1,"shapDrivers":1,"lastUpdated":1,"_id":0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
