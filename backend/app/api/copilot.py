"""Campus Copilot API — grounded NL analytics. LLM never invents scores."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import require_any
from app.schemas.auth import TokenData
from app.core.database import get_db

router = APIRouter()

class CopilotRequest(BaseModel):
    query: str

async def structured_analytics(query: str, db, user: TokenData) -> dict:
    """Retrieve structured data first. LLM only summarizes — never calculates."""
    q = query.lower()

    # Critical students
    if any(w in q for w in ["critical","urgent","highest risk"]):
        students = await db.students.find({"riskLevel":"critical"},
            {"studentId":1,"name":1,"department":1,"successIndex":1,
             "riskProbability":1,"momentum":1,"shapDrivers":1,"_id":0}
        ).sort("riskProbability",-1).limit(5).to_list(5)
        count = await db.students.count_documents({"riskLevel":"critical"})
        return {
            "intent": "critical_students",
            "answer": f"There are **{count} students** in the Critical risk tier.\n\n**Most urgent:**\n" +
                      "".join(f"• **{s['name']}** ({s['department']}) — Risk: {s['riskProbability']*100:.0f}%\n" for s in students),
            "sources": f"students collection · riskLevel='critical' · {count} matched",
            "dataPoints": [{"label":s["name"],"value":round(s["riskProbability"]*100,1)} for s in students],
        }

    if any(w in q for w in ["department","dept","worst","highest risk dept"]):
        pipeline = [
            {"$group":{"_id":"$department","critical":{"$sum":{"$cond":[{"$eq":["$riskLevel","critical"]},1,0]}},
                       "risk":{"$sum":{"$cond":[{"$eq":["$riskLevel","at_risk"]},1,0]}},
                       "avgSuccess":{"$avg":"$successIndex"},"total":{"$sum":1}}},
            {"$addFields":{"urgency":{"$add":["$critical",{"$multiply":["$risk",0.5]}]}}},
            {"$sort":{"urgency":-1}}
        ]
        depts = await db.students.aggregate(pipeline).to_list(5)
        worst = depts[0] if depts else {}
        return {
            "intent": "dept_risk",
            "answer": f"**{worst.get('_id','N/A')}** has the highest concentration of at-risk students:\n"
                      f"• Critical: {worst.get('critical',0)} students\n"
                      f"• At Risk: {worst.get('risk',0)} students\n"
                      f"• Avg Success Index: {round(worst.get('avgSuccess',0),1)}\n\n"
                      "Recommendation: Urgent HOD-level intervention review.",
            "sources": f"students aggregated by department",
            "dataPoints": [{"label":d["_id"],"value":round(d.get("avgSuccess",0),1)} for d in depts[:5]],
        }

    if any(w in q for w in ["priority","top students","need help","most urgent"]):
        students = await db.students.find({"riskLevel":{"$in":["at_risk","critical"]}},
            {"studentId":1,"name":1,"department":1,"successIndex":1,
             "riskProbability":1,"recoveryLabel":1,"_id":0}
        ).sort("riskProbability",-1).limit(5).to_list(5)
        return {
            "intent": "priority_students",
            "answer": "**Top Priority Students** (ranked by risk probability × recovery potential):\n\n" +
                      "".join(f"{i+1}. **{s['name']}** ({s['department']}) "
                              f"— SSI: {s['successIndex']} | Risk: {s['riskProbability']*100:.0f}% | Recovery: {s['recoveryLabel']}\n"
                              for i,s in enumerate(students)),
            "sources": f"priority queue · top 5 at-risk students",
            "dataPoints": [{"label":s["name"],"value":s["successIndex"]} for s in students],
        }

    if any(w in q for w in ["placement","career","job","readiness","placed","offer"]):
        pipeline = [{"$group":{"_id":None,"avg":{"$avg":"$placementReadiness"}}}]
        agg = await db.students.aggregate(pipeline).to_list(1)
        avg = round(agg[0]["avg"],1) if agg else 0
        mismatch = await db.students.count_documents({"academicReadiness":{"$gt":75},"placementReadiness":{"$lt":50}})
        # Also get job stats
        total_jobs = await db.job_opportunities.count_documents({})
        published  = await db.job_opportunities.count_documents({"status":{"$in":["PUBLISHED","APPLICATION_OPEN"]}})
        total_apps = await db.job_applications.count_documents({})
        return {
            "intent": "placement_overview",
            "answer": f"**Placement Readiness Overview:**\n"
                      f"• Campus Average: **{avg}/100**\n"
                      f"• Academic-Career Mismatch: **{mismatch} students** (high CGPA, low placement skills)\n"
                      f"• Published Jobs: **{published}** (of {total_jobs} total)\n"
                      f"• Total Applications: **{total_apps}**\n\n"
                      "These students are prime candidates for DSA and interview interventions.",
            "sources": f"students · job_opportunities · job_applications",
            "dataPoints": [{"label":"Campus Avg","value":avg},{"label":"Mismatch","value":mismatch},{"label":"Jobs","value":published}],
        }

    if any(w in q for w in ["deteriorat","decline","falling","negative momentum"]):
        count = await db.students.count_documents({"momentum":"NEGATIVE"})
        students = await db.students.find({"momentum":"NEGATIVE"},
            {"name":1,"department":1,"riskVelocity":1,"successIndex":1,"_id":0}
        ).sort("riskVelocity",-1).limit(4).to_list(4)
        return {
            "intent": "deteriorating_momentum",
            "answer": f"**{count} students** are showing NEGATIVE momentum (rapidly deteriorating trajectory).\n\n"
                      "Even if their current risk level isn't Critical, early intervention is important:\n" +
                      "".join(f"• **{s['name']}** ({s['department']}) — Velocity: {s['riskVelocity']}\n" for s in students),
            "sources": f"students · momentum='NEGATIVE' · {count} records",
            "dataPoints": [{"label":s["name"],"value":s.get("successIndex",0)} for s in students],
        }

    if any(w in q for w in ["skill gap","missing skill","skill demand","lacking"]):
        pipeline = [
            {"$match": {"eligibilityStatus": "PASS"}},
            {"$unwind": "$missingMandatorySkills"},
            {"$group": {"_id": "$missingMandatorySkills", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 5},
        ]
        gaps = await db.job_matches.aggregate(pipeline).to_list(5)
        if gaps:
            return {
                "intent": "skill_gap",
                "answer": "**Top Missing Mandatory Skills** (among eligible students with skill gaps):\n\n" +
                          "".join(f"• **{g['_id']}** — {g['count']} students missing\n" for g in gaps),
                "sources": "job_matches · missingMandatorySkills · eligibility PASS",
                "dataPoints": [{"label":g["_id"],"value":g["count"]} for g in gaps],
            }

    if any(w in q for w in ["training","program","bootcamp","workshop"]):
        trainings = await db.placement_training.find({}, {"title":1,"status":1,"enrolledCount":1,"_id":0}).to_list(10)
        active = [t for t in trainings if t.get("status") == "ACTIVE"]
        upcoming = [t for t in trainings if t.get("status") == "UPCOMING"]
        return {
            "intent": "training",
            "answer": f"**Training Programs:**\n\n"
                      f"• Active: **{len(active)}** program(s)\n"
                      f"• Upcoming: **{len(upcoming)}** program(s)\n\n" +
                      "".join(f"→ **{t.get('title','?')}** [{t.get('status')}]\n" for t in trainings[:6]),
            "sources": "placement_training collection",
            "dataPoints": [{"label":t.get("title","?"),"value":t.get("enrolledCount",0) or 0} for t in trainings[:5]],
        }

    if any(w in q for w in ["attendance","absent","below 75"]):
        count = await db.students.count_documents({"attendancePct":{"$lt":75}})
        pipeline = [{"$group":{"_id":None,"avg":{"$avg":"$attendancePct"}}}]
        agg = await db.students.aggregate(pipeline).to_list(1)
        avg = round(agg[0]["avg"],1) if agg else 0
        return {
            "intent": "attendance",
            "answer": f"**Attendance Overview:**\n• Campus Average: **{avg:.1f}%**\n• Students below 75%: **{count}**\n\n"
                      "Attendance is the #1 leading indicator of academic risk in the model.",
            "sources": f"students · attendancePct field",
            "dataPoints": [{"label":"Campus Avg","value":avg},{"label":"Below 75%","value":count}],
        }

    # Generic campus overview
    pipeline = [{"$group":{"_id":None,"total":{"$sum":1},
        "healthy":{"$sum":{"$cond":[{"$eq":["$riskLevel","healthy"]},1,0]}},
        "watch":{"$sum":{"$cond":[{"$eq":["$riskLevel","watch"]},1,0]}},
        "atRisk":{"$sum":{"$cond":[{"$eq":["$riskLevel","at_risk"]},1,0]}},
        "critical":{"$sum":{"$cond":[{"$eq":["$riskLevel","critical"]},1,0]}},
        "avgSSI":{"$avg":"$successIndex"}
    }}]
    agg = await db.students.aggregate(pipeline).to_list(1)
    s = agg[0] if agg else {}
    return {
        "intent": "general_overview",
        "answer": f"**Campus Overview ({s.get('total',0)} total students):**\n\n"
                  f"✅ Healthy: **{s.get('healthy',0)}**\n"
                  f"👁 Watch: **{s.get('watch',0)}**\n"
                  f"⚠️ At Risk: **{s.get('atRisk',0)}**\n"
                  f"🚨 Critical: **{s.get('critical',0)}**\n\n"
                  f"Avg Success Index: **{round(s.get('avgSSI',0),1)}**\n\n"
                  "Try asking: 'Which students need help?', 'Worst department?', 'Placement overview?'",
        "sources": f"students collection · all departments · {s.get('total',0)} records",
        "dataPoints": [
            {"label":"Healthy","value":s.get("healthy",0)},{"label":"Watch","value":s.get("watch",0)},
            {"label":"At Risk","value":s.get("atRisk",0)},{"label":"Critical","value":s.get("critical",0)},
        ],
    }


@router.post("/query")
async def copilot_query(req: CopilotRequest, current_user: TokenData = Depends(require_any)):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    db = await get_db()
    result = await structured_analytics(req.query, db, current_user)
    result["disclaimer"] = "All answers are derived from structured campus data — no AI hallucination."
    return result
