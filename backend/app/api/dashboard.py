"""API stub routers — stubs to be fleshed out in subsequent phases."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from app.core.security import get_current_user, require_any, require_admin, require_placement
from app.schemas.auth import TokenData
from app.core.database import get_db

router = APIRouter()

@router.get("/summary")
async def dashboard_summary(current_user: TokenData = Depends(require_any)):
    db = await get_db()
    dept_filter = {}
    if current_user.role.value == "HOD" and current_user.department:
        dept_filter = {"department": current_user.department}

    total   = await db.students.count_documents(dept_filter)
    healthy = await db.students.count_documents({**dept_filter, "riskLevel": "healthy"})
    watch   = await db.students.count_documents({**dept_filter, "riskLevel": "watch"})
    at_risk = await db.students.count_documents({**dept_filter, "riskLevel": "at_risk"})
    critical= await db.students.count_documents({**dept_filter, "riskLevel": "critical"})
    det     = await db.students.count_documents({**dept_filter, "momentum": "NEGATIVE"})
    improving= await db.students.count_documents({**dept_filter, "momentum": "POSITIVE"})

    # Averages
    pipeline = [
        {"$match": dept_filter},
        {"$group": {"_id": None,
            "avgSuccess":    {"$avg": "$successIndex"},
            "avgPlacement":  {"$avg": "$placementReadiness"},
            "avgAttendance": {"$avg": "$attendancePct"},
            "avgRisk":       {"$avg": "$riskProbability"},
        }}
    ]
    agg = await db.students.aggregate(pipeline).to_list(1)
    avgs = agg[0] if agg else {}

    # Department breakdown
    dept_pipe = [
        {"$match": dept_filter},
        {"$group": {"_id": "$department",
            "total":       {"$sum": 1},
            "avgSuccess":  {"$avg": "$successIndex"},
            "avgPlacement":{"$avg": "$placementReadiness"},
            "critical":    {"$sum": {"$cond": [{"$eq":["$riskLevel","critical"]},1,0]}},
            "risk":        {"$sum": {"$cond": [{"$eq":["$riskLevel","at_risk"]},1,0]}},
        }},
        {"$sort": {"total": -1}}
    ]
    dept_stats = await db.students.aggregate(dept_pipe).to_list(10)
    for d in dept_stats:
        d["department"] = d.pop("_id")

    # Priority queue — at-risk students sorted by urgency
    priority = await db.students.find(
        {**dept_filter, "riskLevel": {"$in": ["at_risk","critical"]}},
        {"studentId":1,"name":1,"department":1,"semester":1,"successIndex":1,
         "riskLevel":1,"riskProbability":1,"momentum":1,"recoveryPotential":1,
         "recoveryLabel":1,"riskVelocity":1,"shapDrivers":1,"_id":0}
    ).sort("riskProbability", -1).limit(15).to_list(15)

    # Segment stats
    seg_pipe = [
        {"$match": dept_filter},
        {"$group": {"_id": "$segment", "count": {"$sum":1}}}
    ]
    seg_data = await db.students.aggregate(seg_pipe).to_list(10)
    segment_stats = {s["_id"]: {"count":s["count"],"pct":round(s["count"]/max(1,total)*100,1)} for s in seg_data}

    return {
        "total": total, "healthy": healthy, "watch": watch,
        "atRisk": at_risk, "critical": critical,
        "deteriorating": det, "improving": improving,
        "avgSuccessIndex": round(avgs.get("avgSuccess", 0), 1),
        "avgPlacementReadiness": round(avgs.get("avgPlacement", 0), 1),
        "avgAttendance": round(avgs.get("avgAttendance", 0), 1),
        "avgRiskProbability": round(avgs.get("avgRisk", 0), 3),
        "deptStats": dept_stats,
        "priorityQueue": priority,
        "segmentStats": segment_stats,
    }
