"""
Hard Eligibility Engine + Soft Skill Matching Engine for Campus Pulse AI.

Evaluation order (HARD first, then SOFT):
  1. Graduation Year
  2. Degree
  3. Stream
  4. 10th Percentage
  5. 12th Percentage
  6. Diploma Percentage (if applicable)
  7. CGPA
  8. UG Percentage
  9. Arrear History
  10. Current Arrears
  11. Experience
     ── HARD GATE ──
  12. Mandatory Skill Match   (SOFT — affects score, not eligibility unless strictMandatorySkills=True)
  13. Preferred Skill Match   (SOFT — affects score only)
  14. Role Preference         (SOFT)
  15. Learning Interests      (SOFT)
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.core.stream_catalog import normalize_stream, normalize_degree, ANY_STREAM

# ─── Score weights (v1.0) ─────────────────────────────────────────────────────
SCORE_WEIGHTS = {
    "mandatory_skill": 0.60,
    "preferred_skill": 0.20,
    "proficiency":     0.10,
    "role_preference": 0.05,
    "learning_interest": 0.05,
}
SCORE_VERSION = "v1.0"

# Match categories
MATCH_CATEGORIES = [
    (90, "EXCELLENT_MATCH"),
    (75, "GOOD_MATCH"),
    (55, "POTENTIAL_MATCH"),
    (0,  "SKILL_GAP"),
]

# Known skill aliases for normalization
SKILL_ALIASES: Dict[str, List[str]] = {
    "javascript": ["javascript", "js", "es6", "es2015"],
    "typescript": ["typescript", "ts"],
    "react":      ["react", "react.js", "reactjs"],
    "nodejs":     ["nodejs", "node.js", "node", "express", "expressjs"],
    "python":     ["python", "django", "flask", "fastapi", "pandas", "numpy"],
    "java":       ["java", "spring", "springboot", "spring boot", "hibernate", "maven"],
    "sql":        ["sql", "mysql", "postgresql", "postgres", "oracle", "rdbms"],
    "mongodb":    ["mongodb", "mongo", "mongo db", "nosql"],
    "dsa":        ["dsa", "data structures", "algorithms", "data structures and algorithms"],
    "c":          ["c programming", "c language"],
    "cpp":        ["c++", "cpp", "c plus plus"],
    "dotnet":     [".net", "dotnet", "asp.net", "c#", "csharp"],
    "aws":        ["aws", "amazon web services", "s3", "ec2", "lambda"],
    "azure":      ["azure", "microsoft azure"],
    "gcp":        ["gcp", "google cloud", "google cloud platform"],
    "git":        ["git", "github", "gitlab", "version control"],
    "docker":     ["docker", "containers", "containerization"],
    "kubernetes": ["kubernetes", "k8s"],
    "devops":     ["devops", "ci/cd", "jenkins", "pipeline"],
    "ml":         ["machine learning", "ml", "scikit-learn", "sklearn"],
    "dl":         ["deep learning", "dl", "tensorflow", "pytorch", "keras"],
    "communication": ["communication", "verbal", "written", "presentation"],
}

_NORM_CACHE: Dict[str, str] = {}

for _canonical, _aliases in SKILL_ALIASES.items():
    for _alias in _aliases:
        _NORM_CACHE[_alias.lower().strip()] = _canonical


def normalize_skill(raw: str) -> str:
    """Map any skill string to its canonical form."""
    lo = raw.strip().lower()
    return _NORM_CACHE.get(lo, lo)


# ══════════════════════════════════════════════════════════════════════════════
# HARD ELIGIBILITY ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


class EligibilityResult:
    def __init__(self):
        self.eligible: bool = True
        self.failed_rules: List[Dict] = []
        self.passed_rules: List[str] = []

    def fail(self, rule: str, required: str, actual: str):
        self.eligible = False
        self.failed_rules.append({
            "rule": rule,
            "required": required,
            "actual": actual,
        })

    def ok(self, rule: str):
        self.passed_rules.append(rule)

    def to_dict(self) -> Dict:
        return {
            "eligible": self.eligible,
            "failedRules": self.failed_rules,
            "passedRules": self.passed_rules,
        }


def evaluate_hard_eligibility(student: Dict, job: Dict) -> EligibilityResult:
    """
    Run ALL hard eligibility rules in order.
    Returns EligibilityResult — if eligible=False, job must NOT appear to student.
    """
    result = EligibilityResult()
    eligibility = job.get("eligibility", {})
    academics   = eligibility.get("academics", {})
    arrears_cfg = eligibility.get("arrears", {})
    exp_cfg     = eligibility.get("experience", {})

    # ── 1. Graduation Year ─────────────────────────────────────────────────────
    eligible_years = eligibility.get("graduationYears", [])
    if eligible_years:
        student_year = _safe_int(student.get("graduationYear") or student.get("batch"))
        if student_year and student_year not in eligible_years:
            result.fail(
                "GRADUATION_YEAR",
                f"One of {eligible_years}",
                str(student_year),
            )
        elif student_year:
            result.ok("GRADUATION_YEAR")
        # If no graduationYear on student doc, skip rule (data missing — don't penalize)

    # ── 2. Degree ──────────────────────────────────────────────────────────────
    eligible_degrees = eligibility.get("degrees", [])
    if eligible_degrees:
        raw_degree = student.get("degree") or student.get("degreeType") or ""
        student_degree = normalize_degree(raw_degree)
        if student_degree and student_degree not in eligible_degrees:
            result.fail(
                "DEGREE",
                f"One of {eligible_degrees}",
                student_degree,
            )
        elif student_degree:
            result.ok("DEGREE")

    # ── 3. Stream / Department ──────────────────────────────────────────────────
    eligible_streams = eligibility.get("streams", [])
    any_stream       = eligibility.get("anyStream", False)
    if not any_stream and eligible_streams:
        raw_stream     = student.get("streamCode") or student.get("department") or ""
        student_stream = normalize_stream(raw_stream) or raw_stream.upper()
        if student_stream not in eligible_streams:
            stream_names = eligible_streams
            result.fail(
                "STREAM",
                f"One of {stream_names}",
                student_stream,
            )
        else:
            result.ok("STREAM")
    else:
        result.ok("STREAM")  # anyStream = true → all streams pass

    # ── 4. 10th Percentage ────────────────────────────────────────────────────
    tenth_cfg = academics.get("tenth", {})
    if tenth_cfg.get("required", False):
        min_tenth = _safe_float(tenth_cfg.get("minimumPercentage"))
        student_tenth = _safe_float(
            student.get("tenthPercentage")
            or (student.get("academicProfile") or {}).get("tenthPercentage")
        )
        if student_tenth > 0 and student_tenth < min_tenth:
            result.fail(
                "TENTH_PERCENTAGE",
                f">= {min_tenth}%",
                f"{student_tenth}%",
            )
        elif student_tenth >= min_tenth:
            result.ok("TENTH_PERCENTAGE")

    # ── 5. 12th Percentage ────────────────────────────────────────────────────
    twelfth_cfg = academics.get("twelfth", {})
    if twelfth_cfg.get("required", False):
        min_twelfth = _safe_float(twelfth_cfg.get("minimumPercentage"))
        student_twelfth = _safe_float(
            student.get("twelfthPercentage")
            or (student.get("academicProfile") or {}).get("twelfthPercentage")
        )
        if student_twelfth > 0 and student_twelfth < min_twelfth:
            result.fail(
                "TWELFTH_PERCENTAGE",
                f">= {min_twelfth}%",
                f"{student_twelfth}%",
            )
        elif student_twelfth >= min_twelfth:
            result.ok("TWELFTH_PERCENTAGE")

    # ── 6. Diploma Percentage ─────────────────────────────────────────────────
    diploma_cfg = academics.get("diploma", {})
    if diploma_cfg.get("required", False):
        min_diploma = _safe_float(diploma_cfg.get("minimumPercentage"))
        student_diploma = _safe_float(
            student.get("diplomaPercentage")
            or (student.get("academicProfile") or {}).get("diplomaPercentage")
        )
        if student_diploma > 0 and student_diploma < min_diploma:
            result.fail(
                "DIPLOMA_PERCENTAGE",
                f">= {min_diploma}%",
                f"{student_diploma}%",
            )
        elif student_diploma >= min_diploma:
            result.ok("DIPLOMA_PERCENTAGE")

    # ── 7. CGPA ────────────────────────────────────────────────────────────────
    cgpa_cfg = academics.get("cgpa", {})
    if cgpa_cfg.get("required", False):
        min_cgpa = _safe_float(cgpa_cfg.get("minimum"))
        student_cgpa = _safe_float(
            student.get("cgpa")
            or (student.get("academicProfile") or {}).get("cgpa")
        )
        if student_cgpa > 0 and student_cgpa < min_cgpa:
            result.fail(
                "CGPA",
                f">= {min_cgpa}",
                str(round(student_cgpa, 2)),
            )
        elif student_cgpa >= min_cgpa:
            result.ok("CGPA")

    # ── 8. UG Percentage ──────────────────────────────────────────────────────
    ug_pct_cfg = academics.get("ugPercentage", {})
    if ug_pct_cfg.get("required", False):
        min_ug = _safe_float(ug_pct_cfg.get("minimumPercentage"))
        student_ug = _safe_float(
            student.get("ugPercentage")
            or (student.get("academicProfile") or {}).get("ugPercentage")
        )
        if student_ug > 0 and student_ug < min_ug:
            result.fail(
                "UG_PERCENTAGE",
                f">= {min_ug}%",
                f"{student_ug}%",
            )
        elif student_ug >= min_ug:
            result.ok("UG_PERCENTAGE")

    # ── 9. Arrear History ─────────────────────────────────────────────────────
    history_rule = arrears_cfg.get("historyRule", "HISTORY_ALLOWED")
    if history_rule == "NO_HISTORY":
        max_hist = _safe_int(arrears_cfg.get("maxHistoricalArrears", 0))
        student_hist = _safe_int(
            student.get("historicalArrears")
            or student.get("totalArrearsHistory")
            or (student.get("academicProfile") or {}).get("totalArrearsHistory", 0)
        )
        if student_hist > max_hist:
            result.fail(
                "ARREAR_HISTORY",
                f"<= {max_hist} historical arrears",
                f"{student_hist} historical arrear(s)",
            )
        else:
            result.ok("ARREAR_HISTORY")
    else:
        result.ok("ARREAR_HISTORY")

    # ── 10. Current Arrears ───────────────────────────────────────────────────
    current_rule = arrears_cfg.get("currentRule", "CURRENT_ARREARS_ALLOWED")
    if current_rule in ("NO_CURRENT", "MAX_CURRENT"):
        max_current = _safe_int(arrears_cfg.get("maxCurrentArrears", 0))
        student_current = _safe_int(
            student.get("currentArrears")
            or student.get("backlogCount")
            or (student.get("academicProfile") or {}).get("currentArrears", 0)
        )
        if student_current > max_current:
            result.fail(
                "CURRENT_ARREARS",
                f"<= {max_current} current arrear(s)",
                f"{student_current} current arrear(s)",
            )
        else:
            result.ok("CURRENT_ARREARS")
    else:
        result.ok("CURRENT_ARREARS")

    # ── 11. Experience ────────────────────────────────────────────────────────
    if exp_cfg.get("required", False):
        max_exp_yrs = _safe_float(exp_cfg.get("maximumYears", 0))
        student_exp = _safe_float(
            student.get("experienceYears")
            or (student.get("academicProfile") or {}).get("experienceYears", 0)
        )
        if student_exp > max_exp_yrs:
            result.fail(
                "EXPERIENCE",
                f"<= {max_exp_yrs} year(s) (Fresher role)",
                f"{student_exp} year(s)",
            )
        else:
            result.ok("EXPERIENCE")

    return result


# ══════════════════════════════════════════════════════════════════════════════
# SOFT SKILL MATCHING ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def _get_student_skills_set(student: Dict) -> Dict[str, float]:
    """
    Build a normalized canonical_skill → proficiency_score (0–100) map
    from both structured and legacy skill fields.
    """
    skill_map: Dict[str, float] = {}

    # Legacy flat dict  e.g. skills: {python: 72, java: 85}
    raw_skills = student.get("skills") or {}
    for k, v in raw_skills.items():
        canon = normalize_skill(k)
        skill_map[canon] = max(skill_map.get(canon, 0), _safe_float(v))

    # Structured list  [{skillName, proficiencyScore, verified}, ...]
    structured = student.get("studentSkills") or []
    for s in structured:
        canon = normalize_skill(s.get("skillName", ""))
        prof  = _safe_float(s.get("proficiencyScore") or s.get("proficiencyLevel") or 50)
        if not isinstance(prof, float) or prof > 100:
            prof = 50.0
        if canon:
            skill_map[canon] = max(skill_map.get(canon, 0), prof)

    # Fallback signals for skills not explicitly listed
    coding  = _safe_float(student.get("codingScore", 50))
    apt     = _safe_float(student.get("aptitudeScore", 50))
    for fallback, score in [("dsa", coding), ("sql", apt), ("communication", 60)]:
        if fallback not in skill_map:
            skill_map[fallback] = score

    return skill_map


def _get_student_interests_set(student: Dict) -> set:
    """Return a set of canonical skill names the student is interested in learning."""
    interests = set()
    raw = student.get("learningInterests") or []
    for item in raw:
        if isinstance(item, dict):
            interests.add(normalize_skill(item.get("skillName", "")))
        elif isinstance(item, str):
            interests.add(normalize_skill(item))
    return interests


def compute_skill_match(
    student: Dict,
    job: Dict,
    strict_mandatory: bool = True,
) -> Dict:
    """
    Run soft skill matching AFTER hard eligibility has passed.

    Returns a dict with:
      mandatorySkillScore, preferredSkillScore, overallMatchScore,
      matchCategory, matchedMandatory, missingMandatory,
      matchedPreferred, missingPreferred, explanationPoints,
      visibleToStudent, showAsSkillGapOpportunity
    """
    required_skills = job.get("requiredSkills", []) or []
    mandatory = [s for s in required_skills if s.get("type") == "MANDATORY"]
    preferred = [s for s in required_skills if s.get("type") == "PREFERRED"]

    student_skills    = _get_student_skills_set(student)
    student_interests = _get_student_interests_set(student)

    SKILL_THRESHOLD = 40.0  # minimum proficiency score to count as "having" a skill

    matched_mandatory:  List[str] = []
    missing_mandatory:  List[str] = []
    matched_preferred:  List[str] = []
    missing_preferred:  List[str] = []
    interest_for_missing: List[str] = []

    for skill in mandatory:
        canon = normalize_skill(skill.get("skillName", ""))
        score = student_skills.get(canon, 0)
        if score >= SKILL_THRESHOLD:
            matched_mandatory.append(canon)
        else:
            missing_mandatory.append(canon)
            if canon in student_interests:
                interest_for_missing.append(canon)

    for skill in preferred:
        canon = normalize_skill(skill.get("skillName", ""))
        score = student_skills.get(canon, 0)
        if score >= SKILL_THRESHOLD:
            matched_preferred.append(canon)
        else:
            missing_preferred.append(canon)
            if canon in student_interests:
                interest_for_missing.append(canon)

    # Mandatory skill gate
    has_mandatory_gap = len(missing_mandatory) > 0
    visible_to_student = True
    show_as_gap_opportunity = False

    if has_mandatory_gap and strict_mandatory:
        visible_to_student = False
        allow_gap_section  = job.get("allowSkillGapOpportunities", False)
        show_as_gap_opportunity = allow_gap_section

    # ── Score calculation ──────────────────────────────────────────────────────
    total_mandatory = max(len(mandatory), 1)
    total_preferred = max(len(preferred), 1)

    mandatory_ratio  = len(matched_mandatory) / total_mandatory
    preferred_ratio  = len(matched_preferred) / total_preferred

    # Proficiency: average score of matched skills
    matched_all = matched_mandatory + matched_preferred
    if matched_all:
        prof_score = sum(min(student_skills.get(s, 50), 100) for s in matched_all) / len(matched_all) / 100
    else:
        prof_score = 0.0

    # Role preference score
    preferred_roles   = [r.lower() for r in (student.get("preferredJobRoles") or [])]
    job_role          = (job.get("jobRole") or "").lower()
    job_title         = (job.get("jobTitle") or "").lower()
    role_pref_score   = 1.0 if any(r in job_role or r in job_title for r in preferred_roles) else 0.3

    # Learning interest score
    all_missing        = set(missing_mandatory + missing_preferred)
    learning_score     = len(set(interest_for_missing)) / max(len(all_missing), 1) if all_missing else 1.0

    # Weighted total
    w = SCORE_WEIGHTS
    raw_score = (
        mandatory_ratio  * w["mandatory_skill"] * 100 +
        preferred_ratio  * w["preferred_skill"] * 100 +
        prof_score       * w["proficiency"]     * 100 +
        role_pref_score  * w["role_preference"] * 100 +
        learning_score   * w["learning_interest"]* 100
    )
    overall_score = round(min(raw_score, 100), 1)

    # Category
    match_category = "SKILL_GAP"
    for threshold, label in MATCH_CATEGORIES:
        if overall_score >= threshold:
            match_category = label
            break

    if not visible_to_student:
        match_category = "SKILL_GAP"

    # ── Explanation points ─────────────────────────────────────────────────────
    explanation = _build_explanation(student, job, mandatory_ratio, preferred_ratio,
                                     matched_mandatory, matched_preferred,
                                     missing_mandatory, missing_preferred,
                                     interest_for_missing)

    return {
        "mandatorySkillScore":    round(mandatory_ratio * 100, 1),
        "preferredSkillScore":    round(preferred_ratio * 100, 1),
        "proficiencyScore":       round(prof_score * 100, 1),
        "rolePreferenceScore":    round(role_pref_score * 100, 1),
        "learningInterestScore":  round(learning_score * 100, 1),
        "overallMatchScore":      overall_score,
        "matchCategory":          match_category,
        "matchedMandatorySkills": matched_mandatory,
        "missingMandatorySkills": missing_mandatory,
        "matchedPreferredSkills": matched_preferred,
        "missingPreferredSkills": missing_preferred,
        "interestForMissingSkills": interest_for_missing,
        "explanationPoints":      explanation,
        "visibleToStudent":       visible_to_student,
        "showAsSkillGapOpportunity": show_as_gap_opportunity,
        "scoreVersion":           SCORE_VERSION,
        "calculatedAt":           datetime.utcnow().isoformat() + "Z",
    }


def _build_explanation(
    student: Dict, job: Dict,
    mand_ratio: float, pref_ratio: float,
    matched_mandatory: List[str], matched_preferred: List[str],
    missing_mandatory: List[str], missing_preferred: List[str],
    interest_for_missing: List[str],
) -> List[str]:
    """Generate deterministic, human-readable explanation points from match data."""
    points: List[str] = []
    eligibility = job.get("eligibility", {})

    # Academic eligibility confirmations
    eligible_years = eligibility.get("graduationYears", [])
    if eligible_years and student.get("graduationYear") in eligible_years:
        points.append(f"✓ Your graduation year ({student['graduationYear']}) is eligible")

    eligible_streams = eligibility.get("streams", [])
    student_stream = student.get("streamCode") or student.get("department", "")
    if eligibility.get("anyStream"):
        points.append("✓ All streams are eligible for this role")
    elif student_stream and normalize_stream(student_stream) in eligible_streams:
        points.append(f"✓ Your stream ({student_stream}) is eligible")

    student_cgpa = _safe_float(student.get("cgpa"))
    cgpa_req = eligibility.get("academics", {}).get("cgpa", {})
    if cgpa_req.get("required") and student_cgpa >= _safe_float(cgpa_req.get("minimum")):
        points.append(f"✓ Your CGPA ({student_cgpa}) meets the {cgpa_req['minimum']} requirement")

    # Arrears
    arrears_cfg = eligibility.get("arrears", {})
    if arrears_cfg.get("historyRule") == "NO_HISTORY":
        hist = _safe_int(student.get("historicalArrears", 0) or student.get("totalArrearsHistory", 0))
        if hist == 0:
            points.append("✓ No arrear history — meets company requirement")
    if arrears_cfg.get("currentRule") in ("NO_CURRENT", "MAX_CURRENT"):
        curr = _safe_int(student.get("currentArrears", 0) or student.get("backlogCount", 0))
        if curr == 0:
            points.append("✓ No current arrears")

    # Skills matched
    for skill in matched_mandatory:
        points.append(f"✓ {skill.title()} (Mandatory) — matched")
    for skill in matched_preferred:
        points.append(f"✓ {skill.title()} (Preferred) — matched")

    # Learning interests for missing skills
    for skill in interest_for_missing:
        if skill in missing_mandatory:
            points.append(f"⚡ You are learning {skill.title()} — currently missing (mandatory)")
        elif skill in missing_preferred:
            points.append(f"⚡ You are learning {skill.title()} (preferred) — keep going!")

    # Missing skills (gaps)
    for skill in missing_mandatory:
        if skill not in interest_for_missing:
            points.append(f"✗ {skill.title()} (Mandatory) — not in your profile")
    for skill in missing_preferred:
        if skill not in interest_for_missing:
            points.append(f"○ {skill.title()} (Preferred) — not yet learned")

    return points


# ══════════════════════════════════════════════════════════════════════════════
# COMBINED: Full Eligibility + Match for one student × one job
# ══════════════════════════════════════════════════════════════════════════════

def evaluate_student_job(student: Dict, job: Dict) -> Dict:
    """
    Primary entry point: run hard eligibility then soft matching.
    Returns a complete match record suitable for storing in job_matches collection.
    """
    strict = job.get("strictMandatorySkills", True)

    hard = evaluate_hard_eligibility(student, job)

    if not hard.eligible:
        return {
            "studentId":              student.get("studentId"),
            "jobId":                  job.get("jobId"),
            "eligibilityStatus":      "FAIL",
            "eligibilityFailReasons": hard.failed_rules,
            "eligibilityPassReasons": hard.passed_rules,
            "overallMatchScore":      0,
            "matchCategory":          "NOT_ELIGIBLE",
            "visibleToStudent":       False,
            "showAsSkillGapOpportunity": False,
            "explanationPoints":      [
                f"✗ {r['rule']}: required {r['required']}, you have {r['actual']}"
                for r in hard.failed_rules
            ],
            "scoreVersion":  SCORE_VERSION,
            "calculatedAt":  datetime.utcnow().isoformat() + "Z",
        }

    soft = compute_skill_match(student, job, strict_mandatory=strict)

    return {
        "studentId":               student.get("studentId"),
        "jobId":                   job.get("jobId"),
        "eligibilityStatus":       "PASS",
        "eligibilityFailReasons":  [],
        "eligibilityPassReasons":  hard.passed_rules,
        **soft,
    }


# ══════════════════════════════════════════════════════════════════════════════
# BATCH: Evaluate all students for a single job
# ══════════════════════════════════════════════════════════════════════════════

def evaluate_job_matches(students: List[Dict], job: Dict) -> Tuple[List[Dict], Dict]:
    """
    Evaluate all students against a job.
    Returns (match_records, analytics_summary).
    """
    results: List[Dict] = []
    analytics = {
        "total": len(students),
        "eligible": 0,
        "notEligible": 0,
        "excellentMatch": 0,
        "goodMatch": 0,
        "potentialMatch": 0,
        "skillGap": 0,
        "failReasonCounts": {},
        "streamBreakdown": {},
    }

    for student in students:
        match = evaluate_student_job(student, job)
        results.append(match)

        if match["eligibilityStatus"] == "PASS":
            analytics["eligible"] += 1
            cat = match.get("matchCategory", "SKILL_GAP")
            if cat == "EXCELLENT_MATCH": analytics["excellentMatch"] += 1
            elif cat == "GOOD_MATCH":    analytics["goodMatch"] += 1
            elif cat == "POTENTIAL_MATCH": analytics["potentialMatch"] += 1
            else:                         analytics["skillGap"] += 1

            stream = student.get("streamCode") or student.get("department", "Unknown")
            analytics["streamBreakdown"][stream] = analytics["streamBreakdown"].get(stream, 0) + 1
        else:
            analytics["notEligible"] += 1
            for reason in match.get("eligibilityFailReasons", []):
                rule = reason.get("rule", "UNKNOWN")
                analytics["failReasonCounts"][rule] = analytics["failReasonCounts"].get(rule, 0) + 1

    results.sort(key=lambda x: -x.get("overallMatchScore", 0))
    return results, analytics
