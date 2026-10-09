"""Placement Intelligence API — Full Decision Intelligence Module."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from app.core.security import require_any, require_placement, require_authenticated
from app.schemas.auth import TokenData, UserRole
from app.core.database import get_db
import re, math

router = APIRouter()

# ── Skill taxonomy ─────────────────────────────────────────────────────────────
SKILL_ALIASES = {
    "python":    ["python","django","flask","fastapi","numpy","pandas","pytorch","tensorflow"],
    "java":      ["java","spring","springboot","hibernate","maven","gradle","kotlin"],
    "javascript":["javascript","js","nodejs","node.js","react","angular","vue","typescript","nextjs"],
    "sql":       ["sql","mysql","postgresql","oracle","database","rdbms","mongodb","nosql"],
    "dsa":       ["dsa","data structures","algorithms","leetcode","competitive","dynamic programming","graph","tree","sorting"],
    "communication":["communication","presentation","teamwork","leadership","interpersonal","verbal","written"],
    "problemSolving":["problem solving","analytical","critical thinking","logical","reasoning"],
    "git":       ["git","github","gitlab","version control","ci/cd","devops","docker","kubernetes"],
    "cloud":     ["cloud","aws","azure","gcp","s3","ec2","lambda"],
    "softSkill": ["soft skills","time management","adaptability","collaboration"],
}

# Placement thresholds (configurable via env in production)
THRESHOLDS = {
    "placement_ready":     80,
    "near_ready":          65,
    "placement_risk":      40,
}

def _normalize_skill(s: str) -> str:
    lo = s.strip().lower()
    for canonical, aliases in SKILL_ALIASES.items():
        if any(a in lo for a in aliases):
            return canonical
    return lo

def extract_skills(text: str) -> dict:
    lo = text.lower()
    weights = {}
    for skill, keywords in SKILL_ALIASES.items():
        hits = sum(1 for kw in keywords if kw in lo)
        if hits > 0:
            weights[skill] = min(1.0, 0.3 + hits * 0.25)
    if not weights:
        weights = {"dsa": 0.3, "python": 0.3, "communication": 0.2, "problemSolving": 0.2}
    total = sum(weights.values())
    return {k: round(v/total, 3) for k,v in weights.items()}

def compute_match(student: dict, skill_weights: dict) -> float:
    skills = student.get("skills", {}) or {}
    coding  = student.get("codingScore", 50) or 50
    apt     = student.get("aptitudeScore", 50) or 50
    skill_map = {
        "python":        skills.get("python", coding),
        "java":          skills.get("java", coding),
        "javascript":    skills.get("javascript", coding),
        "sql":           skills.get("sql", apt),
        "dsa":           skills.get("dsa", coding),
        "communication": skills.get("communication", 60),
        "problemSolving":skills.get("problemSolving", apt),
        "git":           skills.get("git", coding),
        "cloud":         skills.get("cloud", coding * 0.7),
        "softSkill":     skills.get("softSkill", 60),
    }
    score = sum(skill_map.get(sk, 50) * w for sk, w in skill_weights.items())
    return round(min(100, score), 1)

def skill_gap_list(student: dict, skill_weights: dict, threshold=60) -> list:
    skills = student.get("skills", {}) or {}
    coding = student.get("codingScore", 50) or 50
    apt    = student.get("aptitudeScore", 50) or 50
    gaps = []
    for sk, w in skill_weights.items():
        if w < 0.10:
            continue
        val = skills.get(sk, coding if sk not in ("sql","communication","problemSolving","softSkill") else apt)
        if val < threshold:
            gaps.append({"skill": sk, "studentScore": round(val, 1), "weight": round(w, 2)})
    gaps.sort(key=lambda x: (-x["weight"], x["studentScore"]))
    return gaps

def placement_segment(student: dict) -> dict:
    pr  = student.get("placementReadiness", 0) or 0
    ar  = student.get("academicReadiness", 0) or 0
    cod = student.get("codingScore", 0) or 0
    apt = student.get("aptitudeScore", 0) or 0
    inter = student.get("mockInterviewScore", 0) or 0

    if pr >= THRESHOLDS["placement_ready"]:
        seg, label = "PLACEMENT_READY", "Placement Ready"
    elif pr >= THRESHOLDS["near_ready"]:
        seg, label = "NEAR_READY", "Near Ready"
        if ar >= 75 and pr < 65:
            seg, label = "ACADEMICALLY_STRONG_CAREER_GAP", "Academic Star · Career Gap"
    elif pr >= THRESHOLDS["placement_risk"]:
        if ar > 75:
            seg, label = "ACADEMICALLY_STRONG_CAREER_GAP", "Academic Star · Career Gap"
        elif inter < 50:
            seg, label = "INTERVIEW_GAP", "Interview Gap"
        else:
            seg, label = "SKILL_GAP", "Skill Gap"
    else:
        if cod >= 75 and apt >= 70:
            seg, label = "HIDDEN_TALENT", "Hidden Talent"
        else:
            seg, label = "CRITICAL_PLACEMENT_RISK", "Critical Placement Risk"

    # Override: detect hidden talent regardless of tier
    if cod >= 80 and apt >= 75 and pr < 65:
        seg, label = "HIDDEN_TALENT", "Hidden Talent"

    return {"placementSegment": seg, "placementSegmentLabel": label}

def placement_risk_label(pr: float) -> str:
    if pr >= THRESHOLDS["placement_ready"]:  return "Low"
    if pr >= THRESHOLDS["near_ready"]:       return "Medium"
    if pr >= THRESHOLDS["placement_risk"]:   return "High"
    return "Critical"

def priority_score(student: dict) -> float:
    pr  = (100 - (student.get("placementReadiness", 0) or 0)) * 0.40
    vel = abs(student.get("riskVelocity", 0) or 0) * 0.25
    rec = (100 - (student.get("recoveryPotential", 50) or 50)) * 0.20
    gap = (100 - (student.get("codingScore", 50) or 50)) * 0.15
    return round(min(100, pr + vel + rec + gap), 1)


# ── Pydantic models ─────────────────────────────────────────────────────────────
class JDMatchRequest(BaseModel):
    jd_text: str
    department: Optional[str] = None
    top_n: int = 30

class JobCreate(BaseModel):
    company:     str
    jobTitle:    str
    description: str
    package:     Optional[str] = None
    location:    Optional[str] = None
    eligibility: Optional[str] = None
    requiredSkills: Optional[List[str]] = []
    department:  Optional[str] = None

class TrainingCreate(BaseModel):
    name:        str
    category:    str
    duration:    str
    trainer:     Optional[str] = None
    department:  Optional[str] = None
    startDate:   Optional[str] = None
    endDate:     Optional[str] = None
    targetSkill: Optional[str] = None

class AssignTrainingRequest(BaseModel):
    studentIds:  List[str]
    trainingId:  str

class OutcomeRecord(BaseModel):
    studentId:        str
    companyId:        Optional[str] = None
    jobRole:          Optional[str] = None
    applicationStatus:str = "NOT_APPLIED"
    offerReceived:    bool = False
    package:          Optional[str] = None

# ── Scope helper ───────────────────────────────────────────────────────────────
def _dept_filter(user: TokenData) -> dict:
    if user.role in (UserRole.ADMIN,):
        return {}
    if user.department:
        return {"department": user.department}
    return {}


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/overview")
async def placement_overview(current_user: TokenData = Depends(require_any)):
    db   = await get_db()
    flt  = _dept_filter(current_user)
    total = await db.students.count_documents(flt)

    ready_flt = {**flt, "placementReadiness": {"$gte": THRESHOLDS["placement_ready"]}}
    near_flt  = {**flt, "placementReadiness": {"$gte": THRESHOLDS["near_ready"], "$lt": THRESHOLDS["placement_ready"]}}
    risk_flt  = {**flt, "placementReadiness": {"$lt":  THRESHOLDS["placement_risk"]}}
    mismatch_flt = {**flt, "academicReadiness": {"$gt": 75}, "placementReadiness": {"$lt": 50}}

    ready_count   = await db.students.count_documents(ready_flt)
    near_count    = await db.students.count_documents(near_flt)
    risk_count    = await db.students.count_documents(risk_flt)
    mismatch_count= await db.students.count_documents(mismatch_flt)

    pipeline = [{"$match": flt}, {"$group": {"_id": None, "avg": {"$avg": "$placementReadiness"}}}]
    agg = await db.students.aggregate(pipeline).to_list(1)
    avg_pr = round(agg[0]["avg"], 1) if agg else 0

    # Top ready
    PROJ = {"studentId":1,"name":1,"department":1,"placementReadiness":1,
            "codingScore":1,"aptitudeScore":1,"mockInterviewScore":1,"skills":1,
            "academicReadiness":1,"cgpa":1,"segment":1,"_id":0}
    top_ready = await db.students.find(ready_flt, PROJ).sort("placementReadiness",-1).limit(20).to_list(20)
    mismatch_students = await db.students.find(mismatch_flt, {**PROJ, "cgpa":1}).sort("academicReadiness",-1).limit(15).to_list(15)
    hidden_talent = await db.students.find(
        {**flt, "codingScore": {"$gte":75}, "aptitudeScore":{"$gte":70}, "placementReadiness":{"$lt":65}},
        PROJ
    ).sort("codingScore",-1).limit(10).to_list(10)

    # Dept breakdown
    dept_pipe = [{"$match": flt}, {"$group":{
        "_id":"$department",
        "count":{"$sum":1},
        "avgPR":{"$avg":"$placementReadiness"},
        "readyCount":{"$sum":{"$cond":[{"$gte":["$placementReadiness",THRESHOLDS["placement_ready"]]},1,0]}},
        "riskCount": {"$sum":{"$cond":[{"$lt": ["$placementReadiness",THRESHOLDS["placement_risk"]]},1,0]}},
    }}]
    dept_breakdown = await db.students.aggregate(dept_pipe).to_list(20)

    return {
        "total":              total,
        "readyCount":         ready_count,
        "nearReadyCount":     near_count,
        "criticalRiskCount":  risk_count,
        "mismatchCount":      mismatch_count,
        "avgPlacementReadiness": avg_pr,
        "readinessPct":       round(ready_count/total*100,1) if total else 0,
        "topReady":           top_ready,
        "mismatchStudents":   mismatch_students,
        "hiddenTalents":      hidden_talent,
        "deptBreakdown":      dept_breakdown,
        "thresholds":         THRESHOLDS,
    }


@router.get("/students")
async def list_placement_students(
    q:          Optional[str]   = Query(None),
    department: Optional[str]   = Query(None),
    segment:    Optional[str]   = Query(None),
    readiness:  Optional[str]   = Query(None),   # ready|near|risk|critical
    sortBy:     str             = Query("placementReadiness"),
    sortAsc:    bool            = Query(False),
    page:       int             = Query(1, ge=1),
    perPage:    int             = Query(30, ge=1, le=100),
    current_user: TokenData     = Depends(require_any),
):
    db  = await get_db()
    flt = _dept_filter(current_user)
    if department:  flt["department"] = department
    if readiness == "ready":    flt["placementReadiness"] = {"$gte": THRESHOLDS["placement_ready"]}
    elif readiness == "near":   flt["placementReadiness"] = {"$gte": THRESHOLDS["near_ready"], "$lt": THRESHOLDS["placement_ready"]}
    elif readiness == "risk":   flt["placementReadiness"] = {"$gte": THRESHOLDS["placement_risk"], "$lt": THRESHOLDS["near_ready"]}
    elif readiness == "critical": flt["placementReadiness"] = {"$lt": THRESHOLDS["placement_risk"]}
    if q:
        flt["$or"] = [{"name":{"$regex":q,"$options":"i"}},{"studentId":{"$regex":q,"$options":"i"}}]

    total = await db.students.count_documents(flt)
    skip  = (page-1)*perPage
    PROJ  = {
        "studentId":1,"name":1,"department":1,"semester":1,"rollNo":1,
        "cgpa":1,"codingScore":1,"aptitudeScore":1,"mockInterviewScore":1,"lmsConsistency":1,
        "placementReadiness":1,"academicReadiness":1,"successIndex":1,
        "riskProbability":1,"riskLevel":1,"riskVelocity":1,"recoveryPotential":1,
        "momentum":1,"segment":1,"segmentLabel":1,"skills":1,"shapDrivers":1,
        "recommendedInterventions":1,"_id":0
    }
    students = await db.students.find(flt, PROJ).sort(sortBy, 1 if sortAsc else -1).skip(skip).limit(perPage).to_list(perPage)

    # Enrich with placement segment + priority score
    for s in students:
        s.update(placement_segment(s))
        s["placementPriorityScore"] = priority_score(s)
        s["placementRiskLabel"] = placement_risk_label(s.get("placementReadiness",0))

    return {"students": students, "total": total, "page": page, "perPage": perPage, "pages": math.ceil(total/perPage)}


@router.get("/students/{student_id}")
async def get_placement_student(student_id: str, current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    flt = {**_dept_filter(current_user), "studentId": student_id}
    student = await db.students.find_one(flt, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or out of scope")

    seg = placement_segment(student)
    student.update(seg)
    student["placementRiskLabel"] = placement_risk_label(student.get("placementReadiness",0))
    student["placementPriorityScore"] = priority_score(student)

    # Dominant skill gap (no JD — use generic SWE profile)
    generic_weights = {"dsa":0.30,"python":0.25,"sql":0.15,"communication":0.15,"problemSolving":0.15}
    student["genericSkillGaps"] = skill_gap_list(student, generic_weights, threshold=60)

    # Placement outcome history from collection
    outcomes = await db.placement_outcomes.find(
        {"studentId": student_id}, {"_id":0}
    ).sort("recordedAt",-1).to_list(10)
    student["placementOutcomes"] = outcomes

    # Training assignments
    trainings = await db.training_assignments.find(
        {"studentId": student_id}, {"_id":0}
    ).to_list(10)
    student["trainingAssignments"] = trainings

    return student


@router.post("/match-jd")
async def match_jd(req: JDMatchRequest, current_user: TokenData = Depends(require_any)):
    if len(req.jd_text.strip()) < 15:
        raise HTTPException(status_code=400, detail="Job description too short")
    db = await get_db()
    skill_weights = extract_skills(req.jd_text)
    flt = _dept_filter(current_user)
    if req.department: flt["department"] = req.department

    students = await db.students.find(flt, {
        "studentId":1,"name":1,"rollNo":1,"department":1,"semester":1,
        "placementReadiness":1,"codingScore":1,"aptitudeScore":1,
        "mockInterviewScore":1,"skills":1,"cgpa":1,"academicReadiness":1,"_id":0
    }).to_list(None)

    results = []
    for s in students:
        match_score = compute_match(s, skill_weights)
        gaps = skill_gap_list(s, skill_weights, threshold=60)
        seg  = placement_segment(s)
        results.append({
            **s,
            "matchScore":         match_score,
            "skillGaps":          [g["skill"] for g in gaps],
            "skillGapDetails":    gaps,
            "matchLabel":         "Strong Match" if match_score>=80 else "Good Match" if match_score>=65 else "Partial Match" if match_score>=50 else "Weak Match",
            **seg,
        })
    results.sort(key=lambda x: -x["matchScore"])
    return {
        "matches":       results[:req.top_n],
        "skillWeights":  skill_weights,
        "totalScanned":  len(students),
        "matchThresholds": {"strong":80,"good":65,"partial":50},
    }


@router.get("/analytics")
async def placement_analytics(current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    flt = _dept_filter(current_user)

    # Dept breakdown
    dept_pipe = [{"$match": flt}, {"$group":{
        "_id":"$department",
        "total":      {"$sum":1},
        "avgPR":      {"$avg":"$placementReadiness"},
        "avgAR":      {"$avg":"$academicReadiness"},
        "avgCoding":  {"$avg":"$codingScore"},
        "avgApt":     {"$avg":"$aptitudeScore"},
        "avgInterview":{"$avg":"$mockInterviewScore"},
        "ready":      {"$sum":{"$cond":[{"$gte":["$placementReadiness",THRESHOLDS["placement_ready"]]},1,0]}},
        "critical":   {"$sum":{"$cond":[{"$lt":["$placementReadiness",THRESHOLDS["placement_risk"]]},1,0]}},
        "mismatch":   {"$sum":{"$cond":[{"$and":[{"$gte":["$academicReadiness",75]},{"$lt":["$placementReadiness",50]}]},1,0]}},
    }}, {"$sort":{"avgPR":-1}}]

    # Skill distribution
    skill_pipe = [{"$match": flt}, {"$group":{
        "_id":None,
        "avgCoding":   {"$avg":"$codingScore"},
        "avgAptitude": {"$avg":"$aptitudeScore"},
        "avgInterview":{"$avg":"$mockInterviewScore"},
        "avgPR":       {"$avg":"$placementReadiness"},
        "dsa_strong":  {"$sum":{"$cond":[{"$gte":["$codingScore",75]},1,0]}},
        "dsa_moderate":{"$sum":{"$cond":[{"$and":[{"$gte":["$codingScore",50]},{"$lt":["$codingScore",75]}]},1,0]}},
        "dsa_weak":    {"$sum":{"$cond":[{"$lt":["$codingScore",50]},1,0]}},
        "apt_strong":  {"$sum":{"$cond":[{"$gte":["$aptitudeScore",75]},1,0]}},
        "apt_weak":    {"$sum":{"$cond":[{"$lt":["$aptitudeScore",50]},1,0]}},
        "int_strong":  {"$sum":{"$cond":[{"$gte":["$mockInterviewScore",75]},1,0]}},
        "int_weak":    {"$sum":{"$cond":[{"$lt":["$mockInterviewScore",50]},1,0]}},
    }}]

    # Segment distribution
    seg_pipe = [{"$match": flt},
        {"$bucket":{"groupBy":"$placementReadiness","boundaries":[0,40,65,80,101],"default":"unknown","output":{"count":{"$sum":1}}}}
    ]

    dept_breakdown = await db.students.aggregate(dept_pipe).to_list(20)
    skill_stats    = await db.students.aggregate(skill_pipe).to_list(1)
    seg_dist       = await db.students.aggregate(seg_pipe).to_list(10)

    # Forecast: students projected to cross ready threshold after interventions
    current_ready = await db.students.count_documents({**flt, "placementReadiness":{"$gte":THRESHOLDS["placement_ready"]}})
    near_ready    = await db.students.count_documents({**flt, "placementReadiness":{"$gte":65,"$lt":THRESHOLDS["placement_ready"]}})
    forecast = current_ready + round(near_ready * 0.45)  # conservative: 45% of near-ready achieve readiness with interventions

    return {
        "deptBreakdown":  dept_breakdown,
        "skillStats":     skill_stats[0] if skill_stats else {},
        "segmentDistribution": seg_dist,
        "forecast":       {"currentReady": current_ready, "projectedReady": forecast, "delta": forecast-current_ready},
    }


# ── Jobs ───────────────────────────────────────────────────────────────────────
@router.get("/jobs")
async def list_jobs(current_user: TokenData = Depends(require_any)):
    db = await get_db()
    jobs = await db.placement_jobs.find({}, {"_id":0}).sort("createdAt",-1).to_list(50)
    return {"jobs": jobs, "total": len(jobs)}

@router.post("/jobs")
async def create_job(req: JobCreate, current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    job_id = f"JOB-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    skills = extract_skills(f"{req.jobTitle} {req.description} {' '.join(req.requiredSkills or [])}")
    doc = {
        **req.model_dump(), "jobId": job_id, "skillWeights": skills,
        "createdBy": current_user.userId, "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.placement_jobs.insert_one(doc)
    await db.audit_logs.insert_one({"action":"CREATE_JOB","userId":current_user.userId,"jobId":job_id,"timestamp":datetime.now(timezone.utc).isoformat()})
    return {"ok": True, "jobId": job_id}


# ── Training ───────────────────────────────────────────────────────────────────
@router.get("/training")
async def list_training(current_user: TokenData = Depends(require_any)):
    db = await get_db()
    programs = await db.training_programs.find({}, {"_id":0}).sort("createdAt",-1).to_list(50)
    return {"programs": programs, "total": len(programs)}

@router.post("/training")
async def create_training(req: TrainingCreate, current_user: TokenData = Depends(require_any)):
    db = await get_db()
    tid = f"TRN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    doc = {**req.model_dump(), "trainingId": tid, "status":"UPCOMING",
           "enrolledCount":0,
           "createdBy": current_user.userId, "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.training_programs.insert_one(doc)
    return {"ok": True, "trainingId": tid}

@router.post("/training/assign")
async def assign_training(req: AssignTrainingRequest, current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    docs = [{"studentId":sid, "trainingId":req.trainingId, "assignedBy":current_user.userId,
              "status":"ASSIGNED","progress":0,"assignedAt":now} for sid in req.studentIds]
    if docs:
        await db.training_assignments.insert_many(docs)
        await db.training_programs.update_one(
            {"trainingId": req.trainingId},
            {"$inc": {"enrolledCount": len(docs)}}
        )
    await db.audit_logs.insert_one({"action":"ASSIGN_TRAINING","userId":current_user.userId,
        "trainingId":req.trainingId,"studentCount":len(req.studentIds),"timestamp":now})
    return {"ok": True, "assigned": len(docs)}


# ── Outcomes ──────────────────────────────────────────────────────────────────
@router.post("/outcomes")
async def record_outcome(req: OutcomeRecord, current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    doc = {**req.model_dump(), "recordedBy": current_user.userId, "recordedAt": now}
    await db.placement_outcomes.replace_one(
        {"studentId": req.studentId, "jobRole": req.jobRole},
        doc, upsert=True
    )
    return {"ok": True}

@router.get("/outcomes")
async def get_outcomes(department: Optional[str] = Query(None), current_user: TokenData = Depends(require_any)):
    db  = await get_db()
    flt: dict = {}
    if department: flt["department"] = department
    outcomes = await db.placement_outcomes.find(flt, {"_id":0}).sort("recordedAt",-1).to_list(100)
    return {"outcomes": outcomes, "total": len(outcomes)}
