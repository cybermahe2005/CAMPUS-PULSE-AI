"""
Campus Pulse AI — Comprehensive Seed Script
Seeds: demo students (eligibility test scenarios) + demo jobs + applications + training records.
Run: python -m scripts.seed_placement_demo
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Fix Windows console encoding for emoji
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from datetime import datetime, timezone, timedelta
import motor.motor_asyncio

MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "campus_pulse")

NOW = datetime.now(timezone.utc)
ISO = lambda d: d.isoformat()


# ══════════════════════════════════════════════════════════════════════════════
# DEMO STUDENTS  — one per eligibility-failure scenario + passing scenarios
# ══════════════════════════════════════════════════════════════════════════════

DEMO_STUDENTS = [
    # ── STU001: Perfect — all criteria pass, mandatory skills present ───────────
    {
        "studentId": "STU001", "name": "Arun Kumar", "rollNo": "CS23001",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "arun.kumar@campus.edu",
        "cgpa": 8.7, "tenthPercentage": 87.5, "twelfthPercentage": 85.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 92.0, "codingScore": 78, "aptitudeScore": 72,
        "mockInterviewScore": 74, "lmsConsistency": 80,
        "certificationCount": 3, "eventCount": 8, "feedbackScore": 85,
        "skills": {"java": 82, "python": 75, "sql": 68, "dsa": 70, "javascript": 60, "git": 72, "communication": 75, "problemSolving": 74},
        "studentSkills": [
            {"skillName": "Java", "proficiencyScore": 82, "source": "CODING_ASSESSMENT", "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "SQL",  "proficiencyScore": 68, "source": "COURSE",             "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "Python","proficiencyScore":75, "source": "PROJECT",             "verified": True, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [{"skillName": "Spring Boot", "interestLevel": "HIGH"}, {"skillName": "AWS", "interestLevel": "MEDIUM"}],
        "preferredJobRoles": ["Software Engineer", "Backend Developer", "Java Developer"],
        "successIndex": 82.0, "academicReadiness": 85.0, "placementReadiness": 76.0, "engagementHealth": 80.0,
        "riskProbability": 0.12, "riskLevel": "healthy", "momentum": "POSITIVE", "riskVelocity": 1.2,
        "recoveryPotential": 70.0, "recoveryLabel": "High",
        "segment": "future_leader", "segmentLabel": "Future Leader",
        "dataConfidence": 95.0,
        "profileType": "future_leader",
        "_demo": True, "_scenario": "PASS_ALL",
    },

    # ── STU002: 1 current arrear — fails current_arrears=0 jobs ────────────────
    {
        "studentId": "STU002", "name": "Priya Devi", "rollNo": "EC23002",
        "department": "Electronics", "streamCode": "ECE", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "priya.devi@campus.edu",
        "cgpa": 7.8, "tenthPercentage": 82.0, "twelfthPercentage": 80.5,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 1, "historicalArrears": 1,
        "backlogCount": 1, "totalArrearsHistory": 1,
        "attendancePct": 78.0, "codingScore": 62, "aptitudeScore": 58,
        "mockInterviewScore": 55, "lmsConsistency": 65,
        "certificationCount": 1, "eventCount": 4, "feedbackScore": 70,
        "skills": {"java": 60, "python": 55, "sql": 52, "dsa": 50, "communication": 65},
        "studentSkills": [{"skillName": "Java", "proficiencyScore": 60, "source": "COURSE", "verified": False, "lastUpdated": ISO(NOW)}],
        "learningInterests": [{"skillName": "Java", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Software Engineer"],
        "successIndex": 62.0, "academicReadiness": 70.0, "placementReadiness": 55.0, "engagementHealth": 60.0,
        "riskProbability": 0.38, "riskLevel": "watch", "momentum": "STABLE", "riskVelocity": -0.5,
        "recoveryPotential": 55.0, "recoveryLabel": "Medium",
        "segment": "recoverable_risk", "segmentLabel": "Recoverable Risk",
        "dataConfidence": 85.0,
        "profileType": "recoverable_risk",
        "_demo": True, "_scenario": "FAIL_CURRENT_ARREARS",
    },

    # ── STU003: Mechanical stream — fails CSE/IT/ECE-only jobs ─────────────────
    {
        "studentId": "STU003", "name": "Ravi Shankar", "rollNo": "ME23003",
        "department": "Mechanical", "streamCode": "MECH", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "ravi.shankar@campus.edu",
        "cgpa": 8.2, "tenthPercentage": 84.0, "twelfthPercentage": 82.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 88.0, "codingScore": 45, "aptitudeScore": 62,
        "mockInterviewScore": 50, "lmsConsistency": 70,
        "certificationCount": 2, "eventCount": 5, "feedbackScore": 78,
        "skills": {"java": 42, "python": 38, "sql": 45, "dsa": 40, "communication": 70},
        "studentSkills": [],
        "learningInterests": [{"skillName": "Python", "interestLevel": "MEDIUM"}],
        "preferredJobRoles": ["Design Engineer", "CAD Engineer"],
        "successIndex": 72.0, "academicReadiness": 80.0, "placementReadiness": 48.0, "engagementHealth": 70.0,
        "riskProbability": 0.22, "riskLevel": "healthy", "momentum": "STABLE", "riskVelocity": 0.2,
        "recoveryPotential": 60.0, "recoveryLabel": "Medium",
        "segment": "academic_star", "segmentLabel": "Academic Star / Career Gap",
        "dataConfidence": 90.0,
        "profileType": "academic_star",
        "_demo": True, "_scenario": "FAIL_STREAM",
    },

    # ── STU004: Historical arrears (2) — fails NO_HISTORY jobs ─────────────────
    {
        "studentId": "STU004", "name": "Lakshmi Reddy", "rollNo": "CS23004",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 7, "graduationYear": 2026,
        "email": "lakshmi.reddy@campus.edu",
        "cgpa": 7.5, "tenthPercentage": 81.0, "twelfthPercentage": 79.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 2,
        "backlogCount": 0, "totalArrearsHistory": 2,
        "attendancePct": 80.0, "codingScore": 65, "aptitudeScore": 60,
        "mockInterviewScore": 62, "lmsConsistency": 68,
        "certificationCount": 2, "eventCount": 5, "feedbackScore": 72,
        "skills": {"java": 68, "python": 62, "sql": 58, "dsa": 60, "communication": 65},
        "studentSkills": [
            {"skillName": "Java", "proficiencyScore": 68, "source": "PROJECT", "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "SQL",  "proficiencyScore": 58, "source": "COURSE",  "verified": False, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [{"skillName": "Spring Boot", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Java Developer"],
        "successIndex": 65.0, "academicReadiness": 72.0, "placementReadiness": 60.0, "engagementHealth": 65.0,
        "riskProbability": 0.30, "riskLevel": "watch", "momentum": "STABLE", "riskVelocity": -0.2,
        "recoveryPotential": 58.0, "recoveryLabel": "Medium",
        "segment": "recoverable_risk", "segmentLabel": "Recoverable Risk",
        "dataConfidence": 88.0,
        "profileType": "recoverable_risk",
        "_demo": True, "_scenario": "FAIL_HISTORICAL_ARREARS",
    },

    # ── STU005: Low CGPA (6.8) — fails CGPA >= 8.0 jobs ──────────────────────
    {
        "studentId": "STU005", "name": "Rahul Patel", "rollNo": "CS23005",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "rahul.patel@campus.edu",
        "cgpa": 6.8, "tenthPercentage": 75.0, "twelfthPercentage": 72.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 72.0, "codingScore": 55, "aptitudeScore": 52,
        "mockInterviewScore": 48, "lmsConsistency": 58,
        "certificationCount": 1, "eventCount": 3, "feedbackScore": 65,
        "skills": {"java": 55, "python": 50, "sql": 48, "dsa": 45, "communication": 60},
        "studentSkills": [],
        "learningInterests": [{"skillName": "DSA", "interestLevel": "HIGH"}, {"skillName": "Java", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Software Engineer"],
        "successIndex": 52.0, "academicReadiness": 55.0, "placementReadiness": 45.0, "engagementHealth": 52.0,
        "riskProbability": 0.55, "riskLevel": "at_risk", "momentum": "NEGATIVE", "riskVelocity": -2.1,
        "recoveryPotential": 45.0, "recoveryLabel": "Medium",
        "segment": "silent_decliner", "segmentLabel": "Silent Decliner",
        "dataConfidence": 82.0,
        "profileType": "silent_decliner",
        "_demo": True, "_scenario": "FAIL_CGPA",
    },

    # ── STU006: Missing academic data — ELIGIBILITY_UNKNOWN ────────────────────
    {
        "studentId": "STU006", "name": "Ananya Singh", "rollNo": "CS23006",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 5, "graduationYear": 2026,
        "email": "ananya.singh@campus.edu",
        "cgpa": None, "tenthPercentage": None, "twelfthPercentage": None,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": None, "historicalArrears": None,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 85.0, "codingScore": 70, "aptitudeScore": 65,
        "mockInterviewScore": 68, "lmsConsistency": 72,
        "certificationCount": 2, "eventCount": 6, "feedbackScore": 80,
        "skills": {"java": 72, "python": 68, "sql": 60, "dsa": 65, "communication": 70},
        "studentSkills": [
            {"skillName": "Java", "proficiencyScore": 72, "source": "CODING_ASSESSMENT", "verified": True, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [{"skillName": "SQL", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Software Engineer"],
        "successIndex": 68.0, "academicReadiness": None, "placementReadiness": 62.0, "engagementHealth": 70.0,
        "riskProbability": None, "riskLevel": "watch", "momentum": "STABLE", "riskVelocity": 0.0,
        "recoveryPotential": 60.0, "recoveryLabel": "Medium",
        "segment": "hidden_talent", "segmentLabel": "Hidden Talent",
        "dataConfidence": 55.0,
        "profileType": "hidden_talent",
        "_demo": True, "_scenario": "MISSING_ACADEMIC_DATA",
    },

    # ── STU007: Eligible but missing mandatory skills (Java) ──────────────────
    {
        "studentId": "STU007", "name": "Karthik Nair", "rollNo": "CS23007",
        "department": "Computer Science", "streamCode": "IT", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "karthik.nair@campus.edu",
        "cgpa": 8.5, "tenthPercentage": 88.0, "twelfthPercentage": 86.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 91.0, "codingScore": 74, "aptitudeScore": 70,
        "mockInterviewScore": 72, "lmsConsistency": 78,
        "certificationCount": 3, "eventCount": 7, "feedbackScore": 82,
        # NOTE: No Java or SQL in skills — but interested in Java
        "skills": {"python": 80, "dsa": 72, "javascript": 75, "react": 70, "communication": 72},
        "studentSkills": [
            {"skillName": "Python",     "proficiencyScore": 80, "source": "PROJECT",          "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "JavaScript", "proficiencyScore": 75, "source": "CERTIFICATION",    "verified": True, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [
            {"skillName": "Java", "interestLevel": "HIGH"},
            {"skillName": "SQL",  "interestLevel": "MEDIUM"},
        ],
        "preferredJobRoles": ["Frontend Developer", "Full Stack Developer"],
        "successIndex": 79.0, "academicReadiness": 84.0, "placementReadiness": 72.0, "engagementHealth": 78.0,
        "riskProbability": 0.14, "riskLevel": "healthy", "momentum": "POSITIVE", "riskVelocity": 1.0,
        "recoveryPotential": 68.0, "recoveryLabel": "High",
        "segment": "future_leader", "segmentLabel": "Future Leader",
        "dataConfidence": 94.0,
        "profileType": "future_leader",
        "_demo": True, "_scenario": "PASS_ELIGIBILITY_FAIL_MANDATORY_SKILLS",
    },

    # ── STU008: AI&DS stream, low 10th ──────────────────────────────────────────
    {
        "studentId": "STU008", "name": "Divya Sharma", "rollNo": "AIDS23008",
        "department": "Computer Science", "streamCode": "AIDS", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "divya.sharma@campus.edu",
        "cgpa": 8.0, "tenthPercentage": 76.0, "twelfthPercentage": 82.0,
        "ugPercentage": None, "diplomaPercentage": None,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 85.0, "codingScore": 68, "aptitudeScore": 65,
        "mockInterviewScore": 66, "lmsConsistency": 72,
        "certificationCount": 2, "eventCount": 6, "feedbackScore": 76,
        "skills": {"python": 72, "sql": 65, "java": 58, "dsa": 62, "communication": 68},
        "studentSkills": [
            {"skillName": "Python", "proficiencyScore": 72, "source": "PROJECT", "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "SQL",    "proficiencyScore": 65, "source": "COURSE",  "verified": True, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [{"skillName": "Java", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Data Analyst", "Software Engineer"],
        "successIndex": 70.0, "academicReadiness": 76.0, "placementReadiness": 64.0, "engagementHealth": 70.0,
        "riskProbability": 0.24, "riskLevel": "healthy", "momentum": "STABLE", "riskVelocity": 0.3,
        "recoveryPotential": 62.0, "recoveryLabel": "Medium",
        "segment": "hidden_talent", "segmentLabel": "Hidden Talent",
        "dataConfidence": 90.0,
        "profileType": "hidden_talent",
        "_demo": True, "_scenario": "FAIL_TENTH_PERCENTAGE",  # fails 80% 10th requirement
    },

    # ── STU009: Wrong graduation year (2025 vs required 2026) ──────────────────
    {
        "studentId": "STU009", "name": "Vikram Joshi", "rollNo": "CS22009",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 8, "graduationYear": 2025,
        "email": "vikram.joshi@campus.edu",
        "cgpa": 8.9, "tenthPercentage": 91.0, "twelfthPercentage": 89.0,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 93.0, "codingScore": 85, "aptitudeScore": 80,
        "mockInterviewScore": 82, "lmsConsistency": 88,
        "certificationCount": 5, "eventCount": 10, "feedbackScore": 92,
        "skills": {"java": 88, "python": 82, "sql": 76, "dsa": 80, "git": 78, "communication": 82},
        "studentSkills": [
            {"skillName": "Java", "proficiencyScore": 88, "source": "CODING_ASSESSMENT", "verified": True, "lastUpdated": ISO(NOW)},
            {"skillName": "SQL",  "proficiencyScore": 76, "source": "CERTIFICATION",     "verified": True, "lastUpdated": ISO(NOW)},
        ],
        "learningInterests": [{"skillName": "Spring Boot", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Java Developer", "Tech Lead"],
        "successIndex": 90.0, "academicReadiness": 92.0, "placementReadiness": 88.0, "engagementHealth": 90.0,
        "riskProbability": 0.05, "riskLevel": "healthy", "momentum": "POSITIVE", "riskVelocity": 2.0,
        "recoveryPotential": 72.0, "recoveryLabel": "High",
        "segment": "future_leader", "segmentLabel": "Future Leader",
        "dataConfidence": 98.0,
        "profileType": "future_leader",
        "_demo": True, "_scenario": "FAIL_GRADUATION_YEAR",
    },

    # ── STU_CR001: Class Representative (student with CR responsibility) ────────
    {
        "studentId": "STU_CR001", "name": "Siddharth Joshi", "rollNo": "CS23010",
        "department": "Computer Science", "streamCode": "CSE", "degree": "BE",
        "semester": 6, "graduationYear": 2026,
        "email": "cr001@campus.edu",
        "cgpa": 8.1, "tenthPercentage": 83.0, "twelfthPercentage": 81.0,
        "currentArrears": 0, "historicalArrears": 0,
        "backlogCount": 0, "totalArrearsHistory": 0,
        "attendancePct": 89.0, "codingScore": 70, "aptitudeScore": 68,
        "mockInterviewScore": 65, "lmsConsistency": 74,
        "certificationCount": 2, "eventCount": 9, "feedbackScore": 88,
        "skills": {"java": 70, "python": 68, "sql": 62, "dsa": 65, "communication": 80},
        "studentSkills": [],
        "learningInterests": [{"skillName": "Java", "interestLevel": "HIGH"}],
        "preferredJobRoles": ["Software Engineer"],
        "successIndex": 76.0, "academicReadiness": 79.0, "placementReadiness": 68.0, "engagementHealth": 78.0,
        "riskProbability": 0.18, "riskLevel": "healthy", "momentum": "POSITIVE", "riskVelocity": 0.8,
        "recoveryPotential": 65.0, "recoveryLabel": "High",
        "segment": "future_leader", "segmentLabel": "Future Leader",
        "dataConfidence": 92.0,
        "profileType": "future_leader",
        "_demo": True, "_scenario": "CLASS_REPRESENTATIVE",
        "responsibilities": ["CLASS_REPRESENTATIVE"],
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# DEMO JOBS
# ══════════════════════════════════════════════════════════════════════════════

DEMO_JOBS = [
    # ── JOB1: Java Developer — strict eligibility ────────────────────────────
    {
        "jobId": "JOB-DEMO-001",
        "companyName": "TechCorp India Pvt. Ltd.",
        "companyWebsite": "https://techcorp.example.com",
        "opportunityType": "ON_CAMPUS_DRIVE",
        "source": "COLLEGE_PLACEMENT_TEAM",
        "jobTitle": "Java Developer — Software Engineer",
        "jobRole": "Java Developer",
        "description": "TechCorp is hiring Java Developers for their Bangalore office. Candidates will work on enterprise-grade Spring Boot microservices.",
        "responsibilities": [
            "Design and develop Java-based microservices",
            "Write and maintain clean, efficient SQL queries",
            "Participate in Agile ceremonies",
            "Code review and testing",
        ],
        "selectionProcess": ["Online Assessment", "Technical Interview", "HR Interview"],
        "jobLocation": "Bangalore, Karnataka",
        "workMode": "ONSITE",
        "employmentType": "FULL_TIME",
        "salaryMin": 6.5, "salaryMax": 8.5,
        "salaryDisplay": "6.5 – 8.5 LPA",
        "applicationDeadline": ISO(NOW + timedelta(days=30)),
        "driveDate": ISO(NOW + timedelta(days=35)),
        "applicationUrl": "https://techcorp.example.com/careers/apply",
        "applicationMethod": "ONLINE_FORM",
        "status": "PUBLISHED",
        "publishedAt": ISO(NOW),
        "createdBy": "placement",
        "createdAt": ISO(NOW),
        "updatedAt": ISO(NOW),
        "eligibility": {
            "graduationYears": [2026],
            "degrees": ["BE", "BTECH"],
            "streams": ["CSE", "IT", "AIDS"],
            "anyStream": False,
            "academics": {
                "tenth":   {"required": True, "minimumPercentage": 80.0},
                "twelfth": {"required": True, "minimumPercentage": 80.0},
                "cgpa":    {"required": True, "minimum": 8.0},
                "diploma": {"required": False},
                "ugPercentage": {"required": False},
            },
            "arrears": {
                "historyRule": "NO_HISTORY",
                "currentRule": "NO_CURRENT",
                "maxHistoricalArrears": 0,
                "maxCurrentArrears": 0,
            },
            "experience": {"required": True, "maximumYears": 0},
        },
        "requiredSkills": [
            {"skillName": "Java",        "type": "MANDATORY"},
            {"skillName": "SQL",         "type": "MANDATORY"},
            {"skillName": "Spring Boot", "type": "PREFERRED"},
            {"skillName": "Git",         "type": "PREFERRED"},
            {"skillName": "DSA",         "type": "PREFERRED"},
        ],
        "strictMandatorySkills": True,
        "allowSkillGapOpportunities": True,
        "matchStats": None,
    },

    # ── JOB2: Python Developer — allows historical arrears ───────────────────
    {
        "jobId": "JOB-DEMO-002",
        "companyName": "DataFlow Analytics",
        "opportunityType": "OFF_CAMPUS_DRIVE",
        "source": "COLLEGE_PLACEMENT_TEAM",
        "jobTitle": "Python Developer",
        "jobRole": "Python Developer",
        "description": "DataFlow is looking for Python engineers to build data pipelines and REST APIs.",
        "responsibilities": ["Build ETL pipelines", "Develop FastAPI/Django REST endpoints", "Write unit tests"],
        "selectionProcess": ["Coding Test", "Technical Round", "HR Round"],
        "jobLocation": "Chennai, Tamil Nadu",
        "workMode": "HYBRID",
        "employmentType": "FULL_TIME",
        "salaryMin": 5.0, "salaryMax": 7.0,
        "salaryDisplay": "5 – 7 LPA",
        "applicationDeadline": ISO(NOW + timedelta(days=20)),
        "driveDate": None,
        "applicationUrl": "https://dataflow.example.com/apply",
        "applicationMethod": "EMAIL",
        "status": "PUBLISHED",
        "publishedAt": ISO(NOW),
        "createdBy": "placement",
        "createdAt": ISO(NOW),
        "updatedAt": ISO(NOW),
        "eligibility": {
            "graduationYears": [2025, 2026],
            "degrees": ["BE", "BTECH", "MCA"],
            "streams": ["CSE", "IT", "AIDS", "AIML"],
            "anyStream": False,
            "academics": {
                "tenth":   {"required": True,  "minimumPercentage": 60.0},
                "twelfth": {"required": True,  "minimumPercentage": 60.0},
                "cgpa":    {"required": True,  "minimum": 6.5},
                "diploma": {"required": False},
                "ugPercentage": {"required": False},
            },
            "arrears": {
                "historyRule": "HISTORY_ALLOWED",   # Historical arrears OK
                "currentRule": "NO_CURRENT",         # No current arrears
                "maxHistoricalArrears": 0,
                "maxCurrentArrears": 0,
            },
            "experience": {"required": True, "maximumYears": 1},
        },
        "requiredSkills": [
            {"skillName": "Python",     "type": "MANDATORY"},
            {"skillName": "SQL",        "type": "MANDATORY"},
            {"skillName": "DSA",        "type": "PREFERRED"},
            {"skillName": "Git",        "type": "PREFERRED"},
            {"skillName": "AWS",        "type": "PREFERRED"},
        ],
        "strictMandatorySkills": True,
        "allowSkillGapOpportunities": True,
        "matchStats": None,
    },

    # ── JOB3: Any stream — full stack internship ──────────────────────────────
    {
        "jobId": "JOB-DEMO-003",
        "companyName": "StartupX",
        "opportunityType": "INTERNSHIP",
        "source": "LINKEDIN",
        "jobTitle": "Full Stack Intern",
        "jobRole": "Full Stack Developer",
        "description": "StartupX is a fast-growing fintech startup. We are looking for passionate full-stack interns.",
        "responsibilities": ["Build React frontends", "REST API development", "Testing and debugging"],
        "selectionProcess": ["Portfolio Review", "Technical Interview"],
        "jobLocation": "Remote",
        "workMode": "REMOTE",
        "employmentType": "INTERNSHIP",
        "salaryMin": 1.5, "salaryMax": 2.5,
        "salaryDisplay": "₹15,000 – ₹25,000/month",
        "applicationDeadline": ISO(NOW + timedelta(days=15)),
        "driveDate": None,
        "applicationUrl": "https://startupx.example.com/internship",
        "applicationMethod": "ONLINE_FORM",
        "status": "PUBLISHED",
        "publishedAt": ISO(NOW),
        "createdBy": "placement",
        "createdAt": ISO(NOW),
        "updatedAt": ISO(NOW),
        "eligibility": {
            "graduationYears": [2026, 2027],
            "degrees": [],
            "streams": [],
            "anyStream": True,
            "academics": {
                "tenth":   {"required": False},
                "twelfth": {"required": False},
                "cgpa":    {"required": True, "minimum": 6.0},
                "diploma": {"required": False},
                "ugPercentage": {"required": False},
            },
            "arrears": {
                "historyRule": "HISTORY_ALLOWED",
                "currentRule": "CURRENT_ARREARS_ALLOWED",
                "maxHistoricalArrears": 0,
                "maxCurrentArrears": 0,
            },
            "experience": {"required": False, "maximumYears": 0},
        },
        "requiredSkills": [
            {"skillName": "JavaScript", "type": "MANDATORY"},
            {"skillName": "React",      "type": "PREFERRED"},
            {"skillName": "NodeJS",     "type": "PREFERRED"},
            {"skillName": "SQL",        "type": "PREFERRED"},
        ],
        "strictMandatorySkills": False,
        "allowSkillGapOpportunities": True,
        "matchStats": None,
    },

    # ── JOB4: DRAFT — should not appear to students ───────────────────────────
    {
        "jobId": "JOB-DEMO-004",
        "companyName": "InfraCloud Solutions",
        "opportunityType": "ONLINE_JOB",
        "source": "COMPANY_CAREER_WEBSITE",
        "jobTitle": "DevOps Engineer",
        "jobRole": "DevOps Engineer",
        "description": "Draft job — not yet published.",
        "responsibilities": [],
        "selectionProcess": [],
        "jobLocation": "Mumbai",
        "workMode": "ONSITE",
        "employmentType": "FULL_TIME",
        "salaryMin": 8.0, "salaryMax": 12.0,
        "salaryDisplay": "8 – 12 LPA",
        "applicationDeadline": ISO(NOW + timedelta(days=45)),
        "status": "DRAFT",
        "publishedAt": None,
        "createdBy": "placement",
        "createdAt": ISO(NOW),
        "updatedAt": ISO(NOW),
        "eligibility": {
            "graduationYears": [2026],
            "degrees": ["BE", "BTECH"],
            "streams": ["CSE", "IT", "ECE"],
            "anyStream": False,
            "academics": {
                "tenth":   {"required": True, "minimumPercentage": 70.0},
                "twelfth": {"required": True, "minimumPercentage": 70.0},
                "cgpa":    {"required": True, "minimum": 7.0},
                "diploma": {"required": False},
                "ugPercentage": {"required": False},
            },
            "arrears": {"historyRule": "HISTORY_ALLOWED", "currentRule": "NO_CURRENT", "maxHistoricalArrears": 0, "maxCurrentArrears": 0},
            "experience": {"required": True, "maximumYears": 0},
        },
        "requiredSkills": [
            {"skillName": "Docker",     "type": "MANDATORY"},
            {"skillName": "Kubernetes", "type": "MANDATORY"},
            {"skillName": "AWS",        "type": "PREFERRED"},
        ],
        "strictMandatorySkills": True,
        "allowSkillGapOpportunities": False,
        "matchStats": None,
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING PROGRAMS
# ══════════════════════════════════════════════════════════════════════════════

DEMO_TRAINING = [
    {
        "trainingId": "TRN-DEMO-001",
        "title": "Java Bootcamp — Enterprise Development",
        "description": "Intensive 4-week Java training covering core Java, Spring Boot, REST APIs, and SQL.",
        "skills": ["Java", "Spring Boot", "SQL"],
        "startDate": ISO(NOW + timedelta(days=5)),
        "endDate":   ISO(NOW + timedelta(days=33)),
        "mode": "OFFLINE",
        "facilitator": "Mr. Vikram Gupta",
        "targetSegments": ["hidden_talent", "recoverable_risk"],
        "targetStreams": ["CSE", "IT", "AIDS"],
        "maxParticipants": 40,
        "enrolledCount": 0,
        "status": "UPCOMING",
        "createdBy": "placement",
        "createdAt": ISO(NOW),
    },
    {
        "trainingId": "TRN-DEMO-002",
        "title": "DSA & Problem Solving — Placement Prep",
        "description": "6-week Data Structures & Algorithms bootcamp focused on placement-level problem solving.",
        "skills": ["DSA", "Problem Solving"],
        "startDate": ISO(NOW + timedelta(days=2)),
        "endDate":   ISO(NOW + timedelta(days=44)),
        "mode": "ONLINE",
        "facilitator": "Ms. Priya Nair",
        "targetSegments": ["silent_decliner", "critical_support"],
        "targetStreams": ["CSE", "IT", "AIDS", "AIML", "ECE"],
        "maxParticipants": 80,
        "enrolledCount": 12,
        "status": "ACTIVE",
        "createdBy": "placement",
        "createdAt": ISO(NOW),
    },
    {
        "trainingId": "TRN-DEMO-003",
        "title": "Mock Interview Workshop",
        "description": "2-day intensive mock interview preparation with industry mentors.",
        "skills": ["Communication", "Interview Skills"],
        "startDate": ISO(NOW + timedelta(days=10)),
        "endDate":   ISO(NOW + timedelta(days=12)),
        "mode": "OFFLINE",
        "facilitator": "HR Panel",
        "targetSegments": ["future_leader", "hidden_talent", "academic_star"],
        "targetStreams": [],  # All streams
        "maxParticipants": 60,
        "enrolledCount": 0,
        "status": "UPCOMING",
        "createdBy": "placement",
        "createdAt": ISO(NOW),
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

async def seed():
    print("🌱 Campus Pulse AI — Seeding placement demo data...")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── Students ──────────────────────────────────────────────────────────────
    print("\n📋 Seeding demo students (eligibility test scenarios)...")
    for s in DEMO_STUDENTS:
        await db.students.replace_one({"studentId": s["studentId"]}, s, upsert=True)
        print(f"  ✅ {s['studentId']} — {s['name']} ({s['_scenario']})")

    # ── Jobs ──────────────────────────────────────────────────────────────────
    print("\n💼 Seeding demo jobs...")
    for j in DEMO_JOBS:
        await db.job_opportunities.replace_one({"jobId": j["jobId"]}, j, upsert=True)
        print(f"  ✅ {j['jobId']} — {j['jobTitle']} @ {j['companyName']} [{j['status']}]")

    # ── Training ──────────────────────────────────────────────────────────────
    print("\n🎓 Seeding training programs...")
    for t in DEMO_TRAINING:
        await db.placement_training.replace_one({"trainingId": t["trainingId"]}, t, upsert=True)
        print(f"  ✅ {t['trainingId']} — {t['title']} [{t['status']}]")

    # ── Pre-calculate matches for published jobs ───────────────────────────────
    print("\n🔄 Pre-calculating eligibility matches for published jobs...")
    try:
        import importlib.util, os as _os
        spec = importlib.util.spec_from_file_location(
            "eligibility_engine",
            _os.path.join(_os.path.dirname(__file__), "..", "app", "core", "eligibility_engine.py"),
        )
        engine_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(engine_mod)
        evaluate_job_matches = engine_mod.evaluate_job_matches

        published = [j for j in DEMO_JOBS if j["status"] == "PUBLISHED"]
        for job in published:
            match_records, analytics = evaluate_job_matches(DEMO_STUDENTS, job)
            for rec in match_records:
                await db.job_matches.replace_one(
                    {"jobId": job["jobId"], "studentId": rec["studentId"]},
                    rec, upsert=True,
                )
            print(f"  📊 {job['jobId']}: {analytics['eligible']}/{analytics['total']} eligible, {analytics['excellentMatch']} excellent matches")
            # Update job with match stats
            await db.job_opportunities.update_one(
                {"jobId": job["jobId"]},
                {"$set": {"matchStats": analytics}},
            )
    except Exception as e:
        print(f"  ⚠️  Match pre-calculation skipped: {e}")

    # ── Demo application ──────────────────────────────────────────────────────
    print("\n📬 Seeding demo application (STU001 → JOB-DEMO-002)...")
    demo_app = {
        "applicationId": "APP-DEMO-001",
        "jobId":         "JOB-DEMO-002",
        "studentId":     "STU001",
        "companyName":   "DataFlow Analytics",
        "jobTitle":      "Python Developer",
        "appliedAt":     ISO(NOW - timedelta(days=2)),
        "status":        "APPLIED",
        "notes":         "Very interested in data pipelines role",
        "lastUpdatedAt": ISO(NOW - timedelta(days=2)),
    }
    await db.job_applications.replace_one({"applicationId": "APP-DEMO-001"}, demo_app, upsert=True)
    print(f"  ✅ APP-DEMO-001 — STU001 applied to DataFlow Analytics")

    client.close()
    print("\n✅ Placement demo seed complete!\n")
    print("Demo accounts:")
    print("  Joint Secretary : js / js123")
    print("  Principal       : principal / principal123")
    print("  HOD (CS)        : hod / hod123")
    print("  Faculty         : faculty / faculty123")
    print("  Placement       : placement / placement123")
    print("  Student (pass)  : stu001 / stu001  (STU001 - eligible)")
    print("  Student (arrear): stu002 / stu002  (STU002 - 1 current arrear)")
    print("  Student (stream): stu003 / stu003  (STU003 - Mechanical)")
    print("  Student (low CGPA): stu005 / stu005 (STU005 - CGPA 6.8)")
    print("  Student (missing data): stu006 / stu006 (STU006 - no academic data)")


if __name__ == "__main__":
    asyncio.run(seed())
