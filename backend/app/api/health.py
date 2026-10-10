"""API Router - Health Check with DB status."""
from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.database import client, db

router = APIRouter()


@router.get("/health", summary="Health check")
async def health():
    db_status = "unknown"
    db_name = None
    try:
        if client is not None:
            await client.admin.command("ping", serverSelectionTimeoutMS=3000)
            db_status = "connected"
            db_name = db.name if db is not None else None
        else:
            db_status = "not_initialized"
    except Exception as e:
        db_status = f"error: {str(e)[:80]}"

    return {
        "status": "ok",
        "service": "CampusPulseAI Backend",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "name": db_name,
        },
    }