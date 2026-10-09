"""Simulator API — What-If scenario engine."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import require_any
from app.schemas.auth import TokenData
from app.core.database import get_db

router = APIRouter()

class SimulatorRequest(BaseModel):
    attendancePct:      Optional[float] = None
    codingScore:        Optional[float] = None
    mockInterviewScore: Optional[float] = None
    aptitudeScore:      Optional[float] = None
    lmsConsistency:     Optional[float] = None
    dsaScore:           Optional[float] = None

def clamp(v, lo=0, hi=100): return max(lo, min(hi, v))

def run_formula(s: dict):
    """Transparent SSI formula — identical to generate_data.py, deterministic."""
    academic_r  = clamp(s["cgpa"] * 9.8 - s.get("backlogCount",0) * 5)
    dsa         = s.get("skills",{}).get("dsa", s.get("codingScore",50))
    placement_r = clamp(s["codingScore"]*0.30 + s["aptitudeScore"]*0.25 +
                        s["mockInterviewScore"]*0.25 + dsa*0.20)
    engagement_h= clamp(s["lmsConsistency"]*0.40 + s.get("eventCount",5)*3.5 +
                        s.get("certificationCount",1)*5 + s["attendancePct"]*0.20)
    mom         = s.get("momentum","STABLE")
    mom_val     = 10 if mom == "POSITIVE" else -10 if mom == "NEGATIVE" else 0
    ssi         = clamp(academic_r*0.35 + placement_r*0.30 + engagement_h*0.20 + mom_val)
    risk_prob   = clamp((100 - ssi) / 100 * 0.8, 0, 1)
    if risk_prob < 0.25: risk_lv = "healthy"
    elif risk_prob < 0.50: risk_lv = "watch"
    elif risk_prob < 0.72: risk_lv = "at_risk"
    else: risk_lv = "critical"
    return {
        "successIndex":       round(ssi, 1),
        "academicReadiness":  round(academic_r, 1),
        "placementReadiness": round(placement_r, 1),
        "engagementHealth":   round(engagement_h, 1),
        "riskProbability":    round(risk_prob, 3),
        "riskLevel":          risk_lv,
    }

@router.post("/{student_id}")
async def simulate(
    student_id: str,
    req: SimulatorRequest,
    current_user: TokenData = Depends(require_any),
):
    db = await get_db()
    student = await db.students.find_one({"studentId": student_id}, {"_id":0})
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

    # Build scenario copy — NEVER modifies real student
    scenario = dict(student)
    changes = req.model_dump(exclude_none=True)
    if "dsaScore" in changes:
        scenario.setdefault("skills", {})["dsa"] = changes.pop("dsaScore")
    scenario.update(changes)

    current_result  = run_formula(student)
    scenario_result = run_formula(scenario)

    delta = {
        "successIndex":       round(scenario_result["successIndex"] - current_result["successIndex"], 1),
        "academicReadiness":  round(scenario_result["academicReadiness"] - current_result["academicReadiness"], 1),
        "placementReadiness": round(scenario_result["placementReadiness"] - current_result["placementReadiness"], 1),
        "engagementHealth":   round(scenario_result["engagementHealth"] - current_result["engagementHealth"], 1),
        "riskProbability":    round(scenario_result["riskProbability"] - current_result["riskProbability"], 3),
    }
    tier_changed = scenario_result["riskLevel"] != current_result["riskLevel"]

    return {
        "studentId":    student_id,
        "studentName":  student["name"],
        "current":      current_result,
        "scenario":     scenario_result,
        "scenarioInputs": changes,
        "delta":        delta,
        "tierChanged":  tier_changed,
        "disclaimer":   "Scenario outputs are model estimates based on a transparent formula. They represent possible outcomes under different conditions, not causal guarantees.",
    }
