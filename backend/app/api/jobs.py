"""
Jobs API — Full Placement Job Opportunity CRUD + Eligibility Engine Integration.
Routes mounted at /api/jobs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.core.security import require_any, require_authenticated
from app.schemas.auth import TokenData, UserRole
from app.core.database import get_db
from app.core.stream_catalog import streams_for_frontend, degrees_for_frontend, normalize_stream, normalize_degree
from app.core.eligibility_engine import evaluate_job_matches, evaluate_student_job

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class AcademicThreshold(BaseModel):
    required: bool = False
    minimumPercentage: Optional[float] = None
    minimum: Optional[float] = None          # for CGPA

class ArrearConfig(BaseModel):
    historyRule: str = "HISTORY_ALLOWED"     # NO_HISTORY | HISTORY_ALLOWED
    currentRule: str = "CURRENT_ARREARS_ALLOWED"  # NO_CURRENT | MAX_CURRENT | CURRENT_ARREARS_ALLOWED
    maxHistoricalArrears: int = 0
    maxCurrentArrears: int = 0

class ExperienceConfig(BaseModel):
    required: bool = False
    maximumYears: float = 0

class EligibilityConfig(BaseModel):
    graduationYears: List[int] = []
    degrees: List[str] = []
    streams: List[str] = []
    anyStream: bool = False
    academics: Dict[str, Any] = Field(default_factory=dict)
    arrears: ArrearConfig = Field(default_factory=ArrearConfig)
    experience: ExperienceConfig = Field(default_factory=ExperienceConfig)

class JobSkill(BaseModel):
    skillName: str
    skillId: Optional[str] = None
    type: str = "MANDATORY"   # MANDATORY | PREFERRED

class JobCreate(BaseModel):
    publish: bool = False   # if True, immediately publish after create
    # Company
    companyName: str
    companyWebsite: Optional[str] = None
    companyLogo: Optional[str] = None

    # Opportunity
    opportunityType: str = "ON_CAMPUS_DRIVE"
    source: str = "COLLEGE_PLACEMENT_TEAM"

    # Role
    jobTitle: str
    jobRole: str
    description: Optional[str] = None
    responsibilities: List[str] = []
    selectionProcess: List[str] = []
    benefits: List[str] = []

    # Location & Type
    jobLocation: Optional[str] = None
    workMode: str = "ONSITE"          # ONSITE | REMOTE | HYBRID
    employmentType: str = "FULL_TIME"

    # Salary
    salaryMin: Optional[float] = None
    salaryMax: Optional[float] = None
    salaryDisplay: Optional[str] = None

    # Experience
    experienceRequired: Optional[str] = None

    # Application
    applicationDeadline: Optional[str] = None
    applicationUrl: Optional[str] = None
    applicationMethod: str = "ONLINE_FORM"
    driveDate: Optional[str] = None
    registrationStart: Optional[str] = None
    registrationEnd: Optional[str] = None

    # Eligibility
    eligibility: EligibilityConfig = Field(default_factory=EligibilityConfig)

    # Skills
    requiredSkills: List[JobSkill] = []

    # Behaviour
    strictMandatorySkills: bool = True
    allowSkillGapOpportunities: bool = False

class JobUpdate(BaseModel):
    jobTitle: Optional[str] = None
    jobRole: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    selectionProcess: Optional[List[str]] = None
    jobLocation: Optional[str] = None
    workMode: Optional[str] = None
    employmentType: Optional[str] = None
    salaryMin: Optional[float] = None
    salaryMax: Optional[float] = None
    salaryDisplay: Optional[str] = None
    applicationDeadline: Optional[str] = None
    applicationUrl: Optional[str] = None
    driveDate: Optional[str] = None
    eligibility: Optional[EligibilityConfig] = None
    requiredSkills: Optional[List[JobSkill]] = None
    strictMandatorySkills: Optional[bool] = None
    allowSkillGapOpportunities: Optional[bool] = None

class ExtractJDRequest(BaseModel):
    jdText: str

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _require_placement_coordinator(user: TokenData):
    """Only ADMIN or users with PLACEMENT_COORDINATOR responsibility can create/edit jobs."""
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FACULTY:
        # Faculty with placement responsibility — accepted
        return
    if user.role in (UserRole.PLACEMENT_OFFICER,):
        return
    raise HTTPException(status_code=403, detail="Placement Coordinator access required")


def _job_visible_to_role(user: TokenData) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.HOD, UserRole.FACULTY, UserRole.PLACEMENT_OFFICER)


def _new_job_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    import random, string
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"JOB-{ts}-{suffix}"


PUBLISHED_STATUSES = {"PUBLISHED", "APPLICATION_OPEN"}

# ─────────────────────────────────────────────────────────────────────────────
# Meta endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/meta/streams")
async def get_stream_catalog(current_user: TokenData = Depends(require_any)):
    """Return grouped stream list for the eligibility builder UI."""
    return {"streams": streams_for_frontend()}


@router.get("/meta/degrees")
async def get_degree_catalog(current_user: TokenData = Depends(require_any)):
    return {"degrees": degrees_for_frontend()}


# ─────────────────────────────────────────────────────────────────────────────
# JD Extraction (AI-assisted)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/extract-jd")
async def extract_jd(req: ExtractJDRequest, current_user: TokenData = Depends(require_any)):
    """
    Parse a raw job description text and return a structured suggestion.
    This is a best-effort heuristic extraction — the faculty MUST review before saving.
    """
    _require_placement_coordinator(current_user)
    text = req.jdText.lower()

    # ── Skill extraction ──────────────────────────────────────────────────────
    KNOWN_SKILLS = [
        "java", "python", "javascript", "typescript", "react", "node.js", "nodejs",
        "angular", "vue", "spring boot", "django", "flask", "fastapi",
        "sql", "mysql", "postgresql", "mongodb", "redis",
        "dsa", "data structures", "algorithms",
        "c++", "c#", ".net", "golang", "rust", "kotlin", "swift",
        "aws", "azure", "gcp", "docker", "kubernetes", "git",
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "communication", "problem solving",
    ]
    found_skills = [s for s in KNOWN_SKILLS if s in text]
    mandatory = found_skills[:min(4, len(found_skills))]
    preferred = found_skills[len(mandatory):]

    # ── CGPA detection ────────────────────────────────────────────────────────
    import re
    cgpa_match = re.search(r"cgpa\s*[>:=]\s*(\d+\.?\d*)", text)
    cgpa_val = float(cgpa_match.group(1)) if cgpa_match else None

    pct_match = re.search(r"(\d{2,3})\s*%\s*(and above|or above|\+|minimum|min)", text)
    pct_val = float(pct_match.group(1)) if pct_match else None

    # ── Year detection ─────────────────────────────────────────────────────────
    year_match = re.findall(r"\b(202[4-9]|203[0-9])\b", req.jdText)
    years = list({int(y) for y in year_match}) if year_match else []

    # ── Stream detection ──────────────────────────────────────────────────────
    CS_STREAMS  = ["CSE", "IT", "AIDS", "AIML", "CSBS", "CYBER"]
    CORE_STREAMS= ["ECE", "EEE", "MECH", "CIVIL"]
    detected_streams: List[str] = []
    if any(k in text for k in ["computer science", "cse", "it ", "information technology"]):
        detected_streams += CS_STREAMS
    if any(k in text for k in ["ece", "eee", "mechanical", "civil", "electronics"]):
        detected_streams += [s for s in CORE_STREAMS if s not in detected_streams]
    if any(k in text for k in ["all branches", "all streams", "any branch", "any stream"]):
        detected_streams = []

    # ── Arrear detection ──────────────────────────────────────────────────────
    no_arrears = any(k in text for k in ["no arrear", "nil arrear", "no backlog", "no current arrear"])
    no_history  = any(k in text for k in ["no history of arrear", "no history of backlog", "no prior arrear"])

    # ── Experience detection ──────────────────────────────────────────────────
    fresher = any(k in text for k in ["fresher", "0 year", "0-1 year", "fresh graduate"])

    return {
        "extracted": {
            "suggestedMandatorySkills": [{"skillName": s, "type": "MANDATORY"} for s in mandatory],
            "suggestedPreferredSkills":  [{"skillName": s, "type": "PREFERRED"} for s in preferred],
            "suggestedGraduationYears":  years,
            "suggestedStreams":          detected_streams if detected_streams else None,
            "anyStream":                 not bool(detected_streams),
            "suggestedCGPA":            cgpa_val,
            "suggestedPercentage":       pct_val,
            "noArrearsRequired":         no_arrears,
            "noHistoryRequired":         no_history,
            "fresherRole":               fresher,
        },
        "warning": "AI extraction is a suggestion only. Please review and confirm all eligibility criteria before publishing.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Job CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.post("")
async def create_job(req: JobCreate, current_user: TokenData = Depends(require_any)):
    _require_placement_coordinator(current_user)
    db     = await get_db()
    job_id = _new_job_id()
    now    = datetime.now(timezone.utc).isoformat()

    data = req.model_dump()
    should_publish = data.pop("publish", False)

    doc = {
        **data,
        "jobId":      job_id,
        "status":     "DRAFT",
        "createdBy":  current_user.userId,
        "createdAt":  now,
        "updatedAt":  now,
        "publishedAt": None,
        "matchStats": None,
    }
    # Normalise stream codes in eligibility
    raw_streams = doc["eligibility"].get("streams", [])
    doc["eligibility"]["streams"] = [
        normalize_stream(s) or s.upper() for s in raw_streams
    ]

    await db.job_opportunities.insert_one(doc)
    await db.audit_logs.insert_one({
        "action": "JOB_CREATE", "userId": current_user.userId,
        "jobId": job_id, "timestamp": now,
    })

    # Immediately publish if requested
    if should_publish:
        FIELDS = {
            "studentId":1,"name":1,"department":1,"streamCode":1,"graduationYear":1,"degree":1,
            "cgpa":1,"tenthPercentage":1,"twelfthPercentage":1,"diplomaPercentage":1,
            "currentArrears":1,"historicalArrears":1,"backlogCount":1,"totalArrearsHistory":1,
            "skills":1,"codingScore":1,"aptitudeScore":1,"preferredJobRoles":1,
            "learningInterests":1,"academicProfile":1,"_id":0,
        }
        students = await db.students.find({}, FIELDS).to_list(None)
        match_records, analytics = evaluate_job_matches(students, doc)
        for rec in match_records:
            await db.job_matches.replace_one(
                {"jobId": job_id, "studentId": rec["studentId"]}, rec, upsert=True
            )
        now2 = datetime.now(timezone.utc).isoformat()
        await db.job_opportunities.update_one(
            {"jobId": job_id},
            {"$set": {"status": "PUBLISHED", "publishedAt": now2, "updatedAt": now2, "matchStats": analytics}},
        )
        return {"ok": True, "jobId": job_id, "status": "PUBLISHED", "matchStats": analytics}

    return {"ok": True, "jobId": job_id, "status": "DRAFT"}


@router.get("")
async def list_jobs(
    status:   Optional[str] = Query(None),
    type:     Optional[str] = Query(None),
    current_user: TokenData = Depends(require_any),
):
    db  = await get_db()
    flt: Dict = {}
    if status: flt["status"] = status
    if type:   flt["opportunityType"] = type

    jobs = await db.job_opportunities.find(flt, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: TokenData = Depends(require_authenticated)):
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}")
async def update_job(job_id: str, req: JobUpdate, current_user: TokenData = Depends(require_any)):
    _require_placement_coordinator(current_user)
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") in ("APPLICATION_CLOSED", "ARCHIVED"):
        raise HTTPException(status_code=400, detail="Cannot edit a closed or archived job")

    updates = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if "eligibility" in updates and "streams" in updates["eligibility"]:
        updates["eligibility"]["streams"] = [
            normalize_stream(s) or s.upper() for s in updates["eligibility"]["streams"]
        ]
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    await db.job_opportunities.update_one({"jobId": job_id}, {"$set": updates})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Preview eligibility (before publish)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{job_id}/preview-eligibility")
async def preview_eligibility(job_id: str, current_user: TokenData = Depends(require_any)):
    """Run eligibility + skill matching against all students and return aggregate stats + top eligible."""
    _require_placement_coordinator(current_user)
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    FIELDS = {
        "studentId":1,"name":1,"department":1,"streamCode":1,"graduationYear":1,"degree":1,
        "cgpa":1,"tenthPercentage":1,"twelfthPercentage":1,"diplomaPercentage":1,
        "currentArrears":1,"historicalArrears":1,"backlogCount":1,"totalArrearsHistory":1,
        "skills":1,"codingScore":1,"aptitudeScore":1,"preferredJobRoles":1,
        "learningInterests":1,"academicProfile":1,"_id":0,
    }
    students_raw = await db.students.find({}, FIELDS).to_list(None)
    match_records, analytics = evaluate_job_matches(students_raw, job)

    # Build a lookup for names
    s_map = {s["studentId"]: s.get("name", s["studentId"]) for s in students_raw}

    eligible_list = [
        {
            "studentId":      r["studentId"],
            "name":           s_map.get(r["studentId"], r["studentId"]),
            "streamCode":     r.get("streamCode", ""),
            "cgpa":           next((s.get("cgpa") for s in students_raw if s["studentId"] == r["studentId"]), None),
            "overallMatchScore": r.get("overallMatchScore", 0),
            "matchCategory":  r.get("matchCategory", ""),
        }
        for r in match_records
        if r.get("eligibilityStatus") == "PASS"
    ][:20]

    return {"analytics": analytics, "jobId": job_id, "eligibleStudents": eligible_list}


# ─────────────────────────────────────────────────────────────────────────────
# Publish job → triggers match calculation
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{job_id}/publish")
async def publish_job(job_id: str, current_user: TokenData = Depends(require_any)):
    _require_placement_coordinator(current_user)
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") not in ("DRAFT", "PENDING_REVIEW"):
        raise HTTPException(status_code=400, detail=f"Job status '{job.get('status')}' cannot be published")

    now = datetime.now(timezone.utc).isoformat()

    # Load all students and run matching
    FIELDS = {
        "studentId":1,"name":1,"department":1,"streamCode":1,"graduationYear":1,"degree":1,
        "cgpa":1,"tenthPercentage":1,"twelfthPercentage":1,"diplomaPercentage":1,
        "currentArrears":1,"historicalArrears":1,"backlogCount":1,"totalArrearsHistory":1,
        "skills":1,"codingScore":1,"aptitudeScore":1,"preferredJobRoles":1,
        "learningInterests":1,"academicProfile":1,"_id":0,
    }
    students = await db.students.find({}, FIELDS).to_list(None)
    match_records, analytics = evaluate_job_matches(students, job)

    # Upsert all match records
    for rec in match_records:
        await db.job_matches.replace_one(
            {"jobId": job_id, "studentId": rec["studentId"]},
            rec, upsert=True,
        )

    # Update job status + stats
    await db.job_opportunities.update_one(
        {"jobId": job_id},
        {"$set": {
            "status":      "PUBLISHED",
            "publishedAt": now,
            "updatedAt":   now,
            "matchStats":  analytics,
        }},
    )
    await db.audit_logs.insert_one({
        "action": "JOB_PUBLISH", "userId": current_user.userId,
        "jobId": job_id, "matchStats": analytics, "timestamp": now,
    })
    return {"ok": True, "jobId": job_id, "matchStats": analytics}


# ─────────────────────────────────────────────────────────────────────────────
# Close a job
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{job_id}/close")
async def close_job(job_id: str, current_user: TokenData = Depends(require_any)):
    _require_placement_coordinator(current_user)
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.job_opportunities.update_one(
        {"jobId": job_id},
        {"$set": {"status": "APPLICATION_CLOSED", "updatedAt": now}},
    )
    await db.audit_logs.insert_one({"action": "JOB_CLOSE", "userId": current_user.userId, "jobId": job_id, "timestamp": now})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Eligible students for a job
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{job_id}/eligible-students")
async def get_eligible_students(
    job_id: str,
    category: Optional[str] = Query(None),
    current_user: TokenData = Depends(require_any),
):
    db  = await get_db()
    flt: Dict = {"jobId": job_id, "eligibilityStatus": "PASS", "visibleToStudent": True}
    if category:
        flt["matchCategory"] = category

    matches = await db.job_matches.find(flt, {"_id": 0}).sort("overallMatchScore", -1).to_list(200)

    # Enrich with student names
    if matches:
        student_ids = [m["studentId"] for m in matches]
        students    = await db.students.find(
            {"studentId": {"$in": student_ids}},
            {"studentId":1,"name":1,"department":1,"cgpa":1,"_id":0},
        ).to_list(None)
        s_map = {s["studentId"]: s for s in students}
        for m in matches:
            m["studentInfo"] = s_map.get(m["studentId"], {})

    return {"matches": matches, "total": len(matches)}


@router.post("/{job_id}/recalculate")
async def recalculate_matches(job_id: str, current_user: TokenData = Depends(require_any)):
    """Force re-run of matching for a published job."""
    _require_placement_coordinator(current_user)
    db  = await get_db()
    job = await db.job_opportunities.find_one({"jobId": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    FIELDS = {
        "studentId":1,"name":1,"department":1,"streamCode":1,"graduationYear":1,"degree":1,
        "cgpa":1,"tenthPercentage":1,"twelfthPercentage":1,
        "currentArrears":1,"historicalArrears":1,"backlogCount":1,"totalArrearsHistory":1,
        "skills":1,"codingScore":1,"aptitudeScore":1,"preferredJobRoles":1,
        "learningInterests":1,"academicProfile":1,"_id":0,
    }
    students = await db.students.find({}, FIELDS).to_list(None)
    match_records, analytics = evaluate_job_matches(students, job)

    for rec in match_records:
        await db.job_matches.replace_one(
            {"jobId": job_id, "studentId": rec["studentId"]},
            rec, upsert=True,
        )
    now = datetime.now(timezone.utc).isoformat()
    await db.job_opportunities.update_one(
        {"jobId": job_id},
        {"$set": {"matchStats": analytics, "updatedAt": now}},
    )
    return {"ok": True, "matchStats": analytics}


# ─────────────────────────────────────────────────────────────────────────────
# Skill demand analytics
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/skill-demand")
async def skill_demand(current_user: TokenData = Depends(require_any)):
    """Top missing skills across all published jobs (for training recommendations)."""
    db = await get_db()
    pipeline = [
        {"$match": {"eligibilityStatus": "PASS"}},
        {"$unwind": "$missingMandatorySkills"},
        {"$group": {"_id": "$missingMandatorySkills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
        {"$project": {"skill": "$_id", "studentsMissing": "$count", "_id": 0}},
    ]
    results = await db.job_matches.aggregate(pipeline).to_list(20)
    return {"skillDemand": results}
