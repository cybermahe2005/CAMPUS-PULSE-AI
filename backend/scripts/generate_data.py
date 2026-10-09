"""
Campus Pulse AI — Synthetic Dataset Generator
Generates 1,000+ realistic students with proper correlations.
Run: python -m scripts.generate_data
"""
import random
import json
import math
import os
from datetime import datetime, timedelta, timezone

SEED = 42
random.seed(SEED)

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
DEPARTMENTS = ["Computer Science","Electronics","Mechanical","Civil","MBA"]
DEPT_ABBR   = {"Computer Science":"CS","Electronics":"EC","Mechanical":"ME","Civil":"CE","MBA":"MBA"}

DEPT_COUNTS = {"Computer Science":220,"Electronics":180,"Mechanical":180,"Civil":160,"MBA":160}

FIRST_NAMES = ["Aarav","Aditi","Akash","Ananya","Arjun","Avni","Bhavesh","Chetan","Deepak","Divya",
               "Eshan","Fatima","Gaurav","Harini","Ishaan","Jaya","Karthik","Kavya","Lakshmi","Manish",
               "Mihir","Nandini","Omkar","Pooja","Priya","Rahul","Riya","Rohan","Sakshi","Sanjay",
               "Shreya","Siddharth","Tanvi","Uday","Varsha","Vikram","Vinita","Yash","Zara","Aditya",
               "Bhargav","Chitra","Dhruv","Ekta","Ganesh","Hema","Indira","Jai","Keerthi","Lokesh",
               "Madhu","Naveen","Padma","Rajesh","Suresh","Anand","Balaji","Chandrima","Dayanand","Elaka"]

LAST_NAMES  = ["Kumar","Sharma","Patel","Singh","Reddy","Nair","Gupta","Iyer","Joshi","Mehta",
               "Pillai","Rao","Shah","Verma","Agarwal","Bhat","Chopra","Das","Fernandez","Ghosh",
               "Hegde","Jain","Krishnan","Lal","Mishra","Naidu","Patil","Rajan","Saxena","Trivedi",
               "Upadhyay","Venkat","Yadav","Zaveri","Bhatt","Choudhary","Dubey","Ezhilan","Fonseca","Garg"]

PROFILE_TYPES = ["future_leader","academic_star","hidden_talent","silent_decliner","critical_support","recoverable_risk"]
PROFILE_DIST  = [0.10, 0.15, 0.15, 0.20, 0.15, 0.25]  # More diverse distribution

SEGMENT_INFO = {
    "future_leader":    "Future Leader",
    "academic_star":    "Academic Star / Career Gap",
    "hidden_talent":    "Hidden Talent",
    "silent_decliner":  "Silent Decliner",
    "critical_support": "Critical Support",
    "recoverable_risk": "Recoverable Risk",
}

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def clamp(v, lo=0, hi=100): return max(lo, min(hi, v))
def r(lo, hi): return lo + random.random()*(hi-lo)
def ri(lo, hi): return random.randint(lo, hi)
def noise(scale=1.0): return random.gauss(0, scale)

def gen_trend(base, periods=6, profile="stable"):
    """Generate a longitudinal trajectory with realistic noise."""
    values, v = [], base
    for i in range(periods):
        n = noise(2.5)
        if   profile == "silent_decliner":  delta = -r(0.5, 2.5) + n*0.3
        elif profile == "critical_support": delta = -r(1.0, 3.5) + n*0.3
        elif profile == "recoverable_risk": delta = r(1.5, 4.0) + n*0.3 if i >= 3 else -r(0.5, 2.0) + n*0.3
        elif profile == "hidden_talent":    delta = r(0.3, 1.5) + n*0.2
        elif profile == "future_leader":    delta = r(0.1, 0.8) + n*0.2
        else:                               delta = n*0.5
        v = clamp(v + delta)
        values.append(round(v, 1))
    return values

# ─────────────────────────────────────────────
# STUDENT GENERATOR
# ─────────────────────────────────────────────
def base_params(profile):
    """Return (cgpa_b, att_b, cod_b, apt_b, mck_b, lms_b, dsa_b) for each profile."""
    if   profile == "future_leader":    return r(8.0,9.5), r(88,98), r(72,92), r(70,92), r(75,95), r(80,96), r(68,90)
    elif profile == "academic_star":    return r(8.2,9.6), r(82,95), r(28,50), r(42,62), r(30,50), r(55,72), r(25,48)
    elif profile == "hidden_talent":    return r(6.5,7.8), r(72,88), r(62,84), r(55,74), r(55,74), r(62,78), r(60,82)
    elif profile == "silent_decliner":  return r(6.8,7.9), r(68,83), r(38,60), r(44,64), r(40,60), r(44,66), r(35,58)
    elif profile == "critical_support": return r(4.2,5.8), r(40,65), r(18,42), r(28,50), r(20,44), r(20,44), r(16,40)
    else:                               return r(5.0,6.5), r(58,76), r(36,58), r(38,58), r(36,56), r(38,58), r(33,56)

def make_skills(profile, cod, apt, dsa):
    """Generate correlated skill scores."""
    java_b  = clamp(cod*0.7 + noise(8))
    py_b    = clamp(cod*0.75 + noise(8))
    sql_b   = clamp(apt*0.6 + noise(10))
    comm_b  = clamp(r(45,75) + (15 if profile=="future_leader" else 0))
    ps_b    = clamp(dsa*0.7 + apt*0.3 + noise(6))
    git_b   = clamp(cod*0.5 + noise(12))
    js_b    = clamp(cod*0.65 + noise(10))
    soft_b  = clamp(comm_b*0.8 + noise(8))
    return {
        "java":round(java_b,1), "python":round(py_b,1), "sql":round(sql_b,1),
        "dsa":round(dsa,1), "communication":round(comm_b,1), "problemSolving":round(ps_b,1),
        "git":round(git_b,1), "javascript":round(js_b,1), "softSkill":round(soft_b,1),
    }

def compute_ssi(academic_r, placement_r, engagement_h, momentum_val):
    """Transparent SSI formula — documented in spec."""
    raw = (academic_r * 0.35 + placement_r * 0.30 + engagement_h * 0.20 + momentum_val)
    return round(clamp(raw), 1)

def risk_from_prob(prob):
    if prob < 0.25: return "healthy"
    if prob < 0.50: return "watch"
    if prob < 0.72: return "at_risk"
    return "critical"

def risk_velocity(traj):
    """Rate of change of risk probability over recent periods."""
    if len(traj) < 3: return 0.0
    recent = traj[-4:]
    deltas = [recent[i+1]-recent[i] for i in range(len(recent)-1)]
    return round(sum(deltas)/len(deltas), 3)

def momentum_label(vel):
    if vel >  1.5: return "POSITIVE"
    if vel < -1.5: return "NEGATIVE"
    return "STABLE"

def recovery_potential(profile, momentum, engagement_h):
    """Simulated recovery score — labeled as estimate, not causal model."""
    base = {
        "recoverable_risk": r(65,90), "hidden_talent": r(55,78),
        "future_leader": r(50,72), "academic_star": r(48,70),
        "silent_decliner": r(30,58), "critical_support": r(18,42),
    }.get(profile, r(30,60))
    bonus = 8 if momentum == "POSITIVE" else -10 if momentum == "NEGATIVE" else 0
    eng_bonus = (engagement_h - 50) * 0.1
    return round(clamp(base + bonus + eng_bonus), 1)

def recovery_label(score):
    if score >= 65: return "High"
    if score >= 40: return "Medium"
    return "Low"

def shap_drivers(s):
    """Generate SHAP-like feature attributions from actual metric values."""
    features = [
        ("CGPA",            s["cgpa"],               abs(7.5 - s["cgpa"]) * 0.15,       s["cgpa"] < 7.5),
        ("Attendance",      f"{s['attendancePct']:.0f}%", abs(75 - s["attendancePct"]) * 0.011, s["attendancePct"] < 75),
        ("DSA Score",       s["skills"]["dsa"],       abs(55 - s["skills"]["dsa"]) * 0.010,  s["skills"]["dsa"] < 55),
        ("Coding Score",    s["codingScore"],         abs(58 - s["codingScore"]) * 0.009,     s["codingScore"] < 58),
        ("LMS Consistency", f"{s['lmsConsistency']:.0f}%",abs(55 - s["lmsConsistency"]) * 0.008, s["lmsConsistency"] < 55),
        ("Mock Interview",  s["mockInterviewScore"],  abs(60 - s["mockInterviewScore"]) * 0.007, s["mockInterviewScore"] < 60),
        ("Aptitude",        s["aptitudeScore"],       abs(58 - s["aptitudeScore"]) * 0.007,  s["aptitudeScore"] < 58),
        ("Backlogs",        s["backlogCount"],        s["backlogCount"] * 0.12,               s["backlogCount"] > 0),
        ("Engagement Events",s["eventCount"],         max(0, 5 - s["eventCount"]) * 0.04,    s["eventCount"] < 5),
    ]
    drivers = []
    for name, val, contrib, is_risk in features:
        if contrib > 0.01:
            drivers.append({
                "feature":      name,
                "value":        val,
                "contribution": round(contrib, 3),
                "direction":    "increases_risk" if is_risk else "reduces_risk",
                "displayLabel": f"{'⬆ Increases' if is_risk else '⬇ Reduces'} Risk",
            })
    drivers.sort(key=lambda x: -x["contribution"])
    return drivers[:5]

def recommend_interventions(s):
    LIBRARY = [
        {"interventionId":"INT-001","name":"Peer Tutoring Program","targetProblem":"Low CGPA","ownerRole":"Mentor","effortLevel":"Low","durationDays":21,"expectedImpact":"CGPA +0.3","evidenceCount":48},
        {"interventionId":"INT-002","name":"Attendance Counseling","targetProblem":"Low Attendance","ownerRole":"Faculty","effortLevel":"Low","durationDays":14,"expectedImpact":"Attendance +8%","evidenceCount":112},
        {"interventionId":"INT-003","name":"21-Day DSA Pathway","targetProblem":"Low DSA Score","ownerRole":"Placement","effortLevel":"High","durationDays":21,"expectedImpact":"DSA +22pts","evidenceCount":67},
        {"interventionId":"INT-004","name":"Mock Interview Workshop","targetProblem":"Low Interview Score","ownerRole":"Placement","effortLevel":"Medium","durationDays":28,"expectedImpact":"Interview +25pts","evidenceCount":89},
        {"interventionId":"INT-005","name":"LMS Engagement Drive","targetProblem":"Low LMS Activity","ownerRole":"Faculty","effortLevel":"Low","durationDays":14,"expectedImpact":"LMS +15%","evidenceCount":156},
        {"interventionId":"INT-006","name":"Mental Health Check-in","targetProblem":"Rapid Deterioration","ownerRole":"Mentor","effortLevel":"Low","durationDays":7,"expectedImpact":"Engagement +","evidenceCount":34},
        {"interventionId":"INT-007","name":"Aptitude Training Series","targetProblem":"Low Aptitude","ownerRole":"Placement","effortLevel":"Medium","durationDays":30,"expectedImpact":"Aptitude +12pts","evidenceCount":94},
        {"interventionId":"INT-008","name":"Coding Bootcamp","targetProblem":"Low Coding Score","ownerRole":"Placement","effortLevel":"High","durationDays":42,"expectedImpact":"Coding +20pts","evidenceCount":67},
    ]
    recs = []
    checks = [
        (s["attendancePct"] < 75,         LIBRARY[1], f"Attendance {s['attendancePct']:.0f}% below 75% threshold", 0.92),
        (s["cgpa"] < 6.5,                 LIBRARY[0], f"CGPA {s['cgpa']:.2f} needs improvement", 0.88),
        (s["skills"]["dsa"] < 50,         LIBRARY[2], f"DSA {s['skills']['dsa']:.0f}/100 insufficient for placement", 0.86),
        (s["codingScore"] < 55,           LIBRARY[7], f"Coding {s['codingScore']:.0f}/100 below placement threshold", 0.84),
        (s["mockInterviewScore"] < 60,    LIBRARY[3], f"Interview {s['mockInterviewScore']:.0f}/100 needs improvement", 0.80),
        (s["lmsConsistency"] < 50,        LIBRARY[4], f"LMS {s['lmsConsistency']:.0f}% shows disengagement", 0.75),
        (s["aptitudeScore"] < 58,         LIBRARY[6], f"Aptitude {s['aptitudeScore']:.0f}/100 below target", 0.70),
        (s.get("momentum") == "NEGATIVE", LIBRARY[5], "Rapidly deteriorating trajectory detected", 0.95),
    ]
    for cond, lib, reason, score in checks:
        if cond:
            recs.append({**lib, "reason": reason, "priorityScore": score})
    recs.sort(key=lambda x: -x["priorityScore"])
    return recs[:3]

def make_trajectory(att_traj, cod_traj, cgpa_traj, risk_traj, ssi_traj):
    labels = [f"Period {i+1}" for i in range(6)]
    return [{"period": labels[i], "attendance": att_traj[i], "codingScore": cod_traj[i],
             "cgpa": cgpa_traj[i], "riskProb": risk_traj[i], "successIndex": ssi_traj[i]}
            for i in range(6)]

def generate_student(idx, dept, profile):
    sem  = random.choice([3,4,5,6,7,8])
    year = 2021 + (sem // 2)
    abbr = DEPT_ABBR[dept]
    roll = f"{abbr}{str(year)[-2:]}{str(idx+1).zfill(3)}"
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    email= name.lower().replace(" ",".") + "@campus.edu"

    cgpa_b, att_b, cod_b, apt_b, mck_b, lms_b, dsa_b = base_params(profile)

    att_traj  = gen_trend(att_b, profile=profile)
    cod_traj  = gen_trend(cod_b, profile=profile)
    cgpa_traj_raw = gen_trend(cgpa_b*10, profile=profile)
    cgpa_traj = [round(clamp(v/10, 0, 10), 2) for v in cgpa_traj_raw]

    att   = att_traj[-1]
    cod   = cod_traj[-1]
    cgpa  = cgpa_traj[-1]
    apt   = round(clamp(apt_b + noise(5)), 1)
    mck   = round(clamp(mck_b + noise(5)), 1)
    lms   = round(clamp(lms_b + noise(6)), 1)
    dsa   = round(clamp(dsa_b + noise(5)), 1)
    evt   = ri(0, 14 if profile=="future_leader" else 3 if profile=="critical_support" else 8)
    blg   = ri(2, 6) if profile=="critical_support" else ri(0,2) if profile != "future_leader" else 0
    cert  = ri(2, 6) if profile in ["future_leader","hidden_talent"] else ri(0, 2)
    fbk   = round(clamp(r(30 if profile=="critical_support" else 55, 95 if profile=="future_leader" else 85)), 1)
    data_conf = round(clamp(72 + (5 if blg == 0 else 0) + noise(10), 42, 98), 1)

    skills = make_skills(profile, cod, apt, dsa)

    academic_r  = round(clamp(cgpa * 9.8 - blg * 5 + noise(3)), 1)
    placement_r = round(clamp(cod*0.30 + apt*0.25 + mck*0.25 + skills["dsa"]*0.20 + noise(4)), 1)
    engagement_h= round(clamp(lms*0.40 + evt*3.5 + cert*5 + att*0.20 + noise(3)), 1)

    att_vel  = risk_velocity(att_traj)
    cod_vel  = risk_velocity(cod_traj)
    momentum = momentum_label((att_vel + cod_vel) / 2)
    mom_val  = 10 if momentum=="POSITIVE" else -10 if momentum=="NEGATIVE" else 0

    ssi = compute_ssi(academic_r, placement_r, engagement_h, mom_val)

    # Risk probability: heuristic formula (XGBoost will replace this in Phase 6)
    risk_prob = round(clamp(
        (100 - ssi) / 100 * 0.8 + (1 - data_conf/100) * 0.2 + noise(3)/100, 0, 1
    ), 3)
    risk_prob_traj = [round(clamp((100-v)/100*0.8 + noise(5)/100, 0, 1), 3)
                      for v in gen_trend(100-ssi, profile=profile)]
    ssi_traj = [round(clamp(100 - v*100, 0, 100), 1) for v in risk_prob_traj]
    risk_vel = risk_velocity([v*100 for v in risk_prob_traj])

    rec_pot = recovery_potential(profile, momentum, engagement_h)
    rec_lbl = recovery_label(rec_pot)
    risk_lvl = risk_from_prob(risk_prob)

    traj = make_trajectory(att_traj, cod_traj, cgpa_traj, risk_prob_traj, ssi_traj)

    s = {
        "studentId": roll, "name": name, "department": dept, "semester": sem,
        "email": email, "rollNo": roll,
        "cgpa": round(cgpa, 2), "attendancePct": round(att, 1),
        "codingScore": round(cod, 1), "aptitudeScore": round(apt, 1),
        "mockInterviewScore": round(mck, 1), "lmsConsistency": round(lms, 1),
        "backlogCount": blg, "certificationCount": cert,
        "eventCount": evt, "feedbackScore": fbk,
        "skills": skills,
        "successIndex": ssi, "academicReadiness": academic_r,
        "placementReadiness": placement_r, "engagementHealth": engagement_h,
        "componentScores": {
            "academicReadiness": academic_r, "placementReadiness": placement_r,
            "engagementHealth": engagement_h, "momentum": mom_val,
        },
        "riskProbability": risk_prob, "riskLevel": risk_lvl,
        "momentum": momentum, "riskVelocity": round(risk_vel, 3),
        "recoveryPotential": rec_pot, "recoveryLabel": rec_lbl,
        "segment": profile, "segmentLabel": SEGMENT_INFO[profile],
        "dataConfidence": data_conf,
        "trajectory": traj,
        "profileType": profile,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }
    s["shapDrivers"] = shap_drivers(s)
    s["recommendedInterventions"] = recommend_interventions(s)

    # Intervention history for recoverable/declining profiles
    s["interventionHistory"] = []
    if profile in ["recoverable_risk", "silent_decliner"] and random.random() < 0.55:
        before_cod = round(max(20, cod - ri(12, 22)))
        after_cod  = round(min(100, before_cod + ri(10, 22)))
        s["interventionHistory"].append({
            "interventionId": "INT-003", "name": "21-Day DSA Pathway",
            "startDate": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
            "endDate":   (datetime.now(timezone.utc) - timedelta(days=24)).isoformat(),
            "status": "COMPLETED", "approvedBy": "Dr. Meenakshi Patel",
            "beforeMetrics": {"codingScore": before_cod, "successIndex": round(ssi - ri(8,18))},
            "afterMetrics":  {"codingScore": after_cod,  "successIndex": ssi},
            "observedImpact": f"Coding improved {before_cod} → {after_cod}. Estimated improvement — not causally confirmed.",
        })
    return s


def generate_all():
    students = []
    idx = 0
    for dept, count in DEPT_COUNTS.items():
        for j in range(count):
            profile = random.choices(PROFILE_TYPES, weights=PROFILE_DIST)[0]
            s = generate_student(idx, dept, profile)
            students.append(s)
            idx += 1
    return students


if __name__ == "__main__":
    import os
    os.makedirs("datasets", exist_ok=True)
    print("⚙️  Generating synthetic dataset...")
    students = generate_all()
    out_path = os.path.join("datasets", "students.json")
    with open(out_path, "w") as f:
        json.dump(students, f, indent=2, default=str)
    n = len(students)
    profiles = {}
    for s in students:
        profiles[s["profileType"]] = profiles.get(s["profileType"], 0) + 1
    risk_counts = {}
    for s in students:
        risk_counts[s["riskLevel"]] = risk_counts.get(s["riskLevel"], 0) + 1
    print(f"✅ Generated {n} students → {out_path}")
    print(f"\nProfile distribution:")
    for p, c in sorted(profiles.items()): print(f"  {p:20s}: {c:4d} ({c/n*100:.1f}%)")
    print(f"\nRisk distribution:")
    for r, c in sorted(risk_counts.items()): print(f"  {r:10s}: {c:4d} ({c/n*100:.1f}%)")
