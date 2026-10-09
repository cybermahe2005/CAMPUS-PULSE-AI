"""
Student Placement API — Personalized job recommendations, applications, skill/interest updates.
Routes mounted at /api/student/placement
All endpoints are student-self-access only (IDOR enforced via JWT sub).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.core.security import require_authenticated
from app.schemas.auth import TokenData, UserRole
from app.core.database import get_db
from app.core.eligibility_engine import evaluate_student_job
import random, string

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Guard — students can only access their own data
# ─────────────────────────────────────────────────────────────────────────────

def _student_id(user: TokenData) -> str:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Student access only")
    return user.userId

STUDENT_PROJ = {
    "studentId":1,"name":1,"department":1,"streamCode":1,"graduationYear":1,"degree":1,
    "cgpa":1,"tenthPercentage":1,"twelfthPercentage":1,"diplomaPercentage":1,
    "currentArrears":1,"historicalArrears":1,"backlogCount":1,"totalArrearsHistory":1,
    "skills":1,"studentSkills":1,"codingScore":1,"aptitudeScore":1,"mockInterviewScore":1,
    "preferredJobRoles":1,"learningInterests":1,"academicProfile":1,
    "placementReadiness":1,"placementBreakdown":1,"segment":1,"_id":0,
}

PUBLISHED = {"$in": ["PUBLISHED", "APPLICATION_OPEN"]}

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ApplyRequest(BaseModel):
    notes: Optional[str] = None

class SkillUpdate(BaseModel):
    skills: List[Dict]

class InterestUpdate(BaseModel):
    learningInterests: List[Dict]
    preferredJobRoles: Optional[List[str]] = None

class AppStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Personalized job recommendations — main feed
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/jobs")
async def student_jobs(
    view: str = Query("recommended"),
    current_user: TokenData = Depends(require_authenticated),
):
    student_id = _student_id(current_user)
    db = await get_db()

    student = await db.students.find_one({"studentId": student_id}, STUDENT_PROJ)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    jobs = await db.job_opportunities.find({"status": PUBLISHED}, {"_id": 0}).to_list(200)

    output = []
    for job in jobs:
        # Use cached match if available, otherwise evaluate on-the-fly
        cached = await db.job_matches.find_one(
            {"jobId": job["jobId"], "studentId": student_id}, {"_id": 0}
        )
        match = cached or evaluate_student_job(student, job)

        eligible  = match.get("eligibilityStatus") == "PASS"
        visible   = match.get("visibleToStudent", False)
        gap_oppty = match.get("showAsSkillGapOpportunity", False)

        # Check if already applied
        app = await db.job_applications.find_one(
            {"jobId": job["jobId"], "studentId": student_id},
            {"applicationId": 1, "status": 1, "_id": 0}
        )
        match["alreadyApplied"]    = bool(app)
        match["applicationStatus"] = app["status"] if app else None

        # Apply view filter
        if view == "recommended" and not (visible and eligible):
            continue
        if view == "eligible" and not eligible:
            continue
        if view == "potential" and not gap_oppty:
            continue

        output.append({
            "job":   {k: v for k, v in job.items() if k != "createdBy"},
            "match": match,
            "isPotentialOpportunity": gap_oppty and not eligible,
        })

    output.sort(key=lambda x: -(x["match"].get("overallMatchScore") or 0))
    return {"jobs": output, "total": len(output), "view": view}


@router.get("/jobs/{job_id}")
async def student_job_detail(job_id: str, current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()

    student = await db.students.find_one({"studentId": student_id}, STUDENT_PROJ)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = await db.job_opportunities.find_one({"jobId": job_id}, {"_id": 0})
    if not job or job.get("status") not in ("PUBLISHED", "APPLICATION_OPEN"):
        raise HTTPException(status_code=404, detail="Job not found")

    cached = await db.job_matches.find_one(
        {"jobId": job_id, "studentId": student_id}, {"_id": 0}
    )
    match = cached or evaluate_student_job(student, job)

    application = await db.job_applications.find_one(
        {"jobId": job_id, "studentId": student_id}, {"_id": 0}
    )
    job.pop("createdBy", None)
    return {"job": job, "match": match, "application": application}


# ─────────────────────────────────────────────────────────────────────────────
# Apply helper (shared between two route aliases)
# ─────────────────────────────────────────────────────────────────────────────

async def _do_apply(job_id: str, req: ApplyRequest, current_user: TokenData) -> Dict:
    student_id = _student_id(current_user)
    db = await get_db()

    job = await db.job_opportunities.find_one({"jobId": job_id, "status": PUBLISHED})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not open")

    # Hard eligibility check — backend enforced, never trust frontend
    student = await db.students.find_one({"studentId": student_id}, STUDENT_PROJ)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    match = await db.job_matches.find_one({"jobId": job_id, "studentId": student_id})
    if match:
        if not match.get("visibleToStudent", False):
            raise HTTPException(status_code=403, detail="You are not eligible for this job")
    else:
        # Real-time eligibility check
        live_match = evaluate_student_job(student, job)
        if live_match.get("eligibilityStatus") != "PASS":
            raise HTTPException(status_code=403, detail="You are not eligible for this job based on current academic records")

    existing = await db.job_applications.find_one({"jobId": job_id, "studentId": student_id})
    if existing:
        raise HTTPException(status_code=409, detail="Already applied")

    app_id = "APP-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + \
             "-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    now = datetime.now(timezone.utc).isoformat()

    await db.job_applications.insert_one({
        "applicationId": app_id, "jobId": job_id, "studentId": student_id,
        "companyName": job.get("companyName"), "jobTitle": job.get("jobTitle"),
        "appliedAt": now, "status": "APPLIED", "notes": req.notes, "lastUpdatedAt": now,
    })
    return {"ok": True, "applicationId": app_id}


# ─────────────────────────────────────────────────────────────────────────────
# Apply routes — two aliases for frontend convenience
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/apply/{job_id}")
async def apply_to_job_shortcut(
    job_id: str, req: ApplyRequest,
    current_user: TokenData = Depends(require_authenticated),
):
    """Primary apply endpoint (used by frontend)."""
    return await _do_apply(job_id, req, current_user)


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str, req: ApplyRequest,
    current_user: TokenData = Depends(require_authenticated),
):
    """Alternate apply endpoint (legacy path)."""
    return await _do_apply(job_id, req, current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Applications tracker
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/applications")
async def my_applications(current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()
    apps = await db.job_applications.find(
        {"studentId": student_id}, {"_id": 0}
    ).sort("appliedAt", -1).to_list(100)
    return {"applications": apps, "total": len(apps)}


# ─────────────────────────────────────────────────────────────────────────────
# Placement profile (academic + skills + interests snapshot)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_placement_profile(current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()
    student = await db.students.find_one({"studentId": student_id}, STUDENT_PROJ)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/readiness")
async def get_readiness(current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()
    student = await db.students.find_one(
        {"studentId": student_id},
        {"placementReadiness":1,"placementBreakdown":1,"segment":1,"name":1,"_id":0}
    )
    if not student:
        raise HTTPException(status_code=404, detail="Profile not found")
    return student


# ─────────────────────────────────────────────────────────────────────────────
# Update skills / interests (self-service)
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/skills")
async def update_skills(req: SkillUpdate, current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.students.update_one(
        {"studentId": student_id},
        {"$set": {"studentSkills": req.skills, "skillsUpdatedAt": now}},
    )
    return {"ok": True}


@router.put("/interests")
async def update_interests(req: InterestUpdate, current_user: TokenData = Depends(require_authenticated)):
    student_id = _student_id(current_user)
    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    updates: Dict = {"learningInterests": req.learningInterests, "interestsUpdatedAt": now}
    if req.preferredJobRoles is not None:
        updates["preferredJobRoles"] = req.preferredJobRoles
    await db.students.update_one({"studentId": student_id}, {"$set": updates})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Faculty — Application management (same router, different role guard)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/faculty/applications")
async def faculty_applications(
    job_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: TokenData = Depends(require_authenticated),
):
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Faculty access only")
    db  = await get_db()
    flt: Dict = {}
    if job_id: flt["jobId"]  = job_id
    if status: flt["status"] = status
    apps = await db.job_applications.find(flt, {"_id": 0}).sort("appliedAt", -1).to_list(500)
    return {"applications": apps, "total": len(apps)}


@router.patch("/faculty/applications/{app_id}")
async def update_application_status(
    app_id: str,
    req: AppStatusUpdate,
    current_user: TokenData = Depends(require_authenticated),
):
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Faculty access only")

    VALID = {"INTERESTED","APPLIED","ASSESSMENT","SHORTLISTED","INTERVIEW",
             "SELECTED","REJECTED","WITHDRAWN","OFFER_RECEIVED","JOINED"}
    if req.status not in VALID:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use one of {VALID}")

    db  = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    result = await db.job_applications.update_one(
        {"applicationId": app_id},
        {"$set": {"status": req.status, "notes": req.notes,
                  "lastUpdatedAt": now, "updatedBy": current_user.userId}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"ok": True}
