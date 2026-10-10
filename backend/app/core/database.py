"""MongoDB async connection using Motor."""
import motor.motor_asyncio
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_db():
    global client, db
    url = settings.MONGODB_URL

    # Build connection kwargs — only add TLS args for Atlas (mongodb+srv://)
    kwargs = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 20000,
    }
    if url.startswith("mongodb+srv://"):
        # Atlas requires TLS; tlsAllowInvalidCertificates=False is the default
        # but we set it explicitly for clarity
        kwargs["tls"] = True
        kwargs["tlsAllowInvalidCertificates"] = False

    logger.info("Connecting to MongoDB...")
    client = motor.motor_asyncio.AsyncIOMotorClient(url, **kwargs)
    db = client[settings.DB_NAME]

    # Non-fatal ping — app starts even if Atlas is temporarily unreachable.
    # This way Render's health check passes and the app comes online.
    # Individual requests will fail with 503 until Atlas accepts the connection.
    try:
        await client.admin.command("ping")
        logger.info(f"Connected to MongoDB database: '{settings.DB_NAME}'")
        await _create_indexes()
    except Exception as e:
        logger.warning(
            f"MongoDB ping failed at startup (will retry on requests): {e}"
        )


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


async def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """Return the database handle. Raises 503 if not connected."""
    if db is None:
        raise RuntimeError(
            "Database not initialized. Check MONGODB_URL env var and "
            "ensure Render IP (0.0.0.0/0) is whitelisted in MongoDB Atlas Network Access."
        )
    return db


async def _create_indexes():
    """Create compound indexes for performance."""
    try:
        await db.students.create_index([("studentId", 1)], unique=True)
        await db.students.create_index([("department", 1), ("semester", 1)])
        await db.students.create_index([("streamCode", 1)])
        await db.students.create_index([("graduationYear", 1)])
        await db.students.create_index([("riskLevel", 1)])
        await db.students.create_index([("segment", 1)])
        await db.predictions.create_index([("studentId", 1), ("calculatedAt", -1)])
        await db.predictions.create_index([("riskLevel", 1)])
        await db.interventions.create_index([("studentId", 1), ("status", 1)])
        await db.job_opportunities.create_index([("jobId", 1)], unique=True)
        await db.job_opportunities.create_index([("status", 1)])
        await db.job_opportunities.create_index([("opportunityType", 1)])
        await db.job_opportunities.create_index([("status", 1), ("applicationDeadline", 1)])
        await db.job_matches.create_index([("jobId", 1), ("studentId", 1)], unique=True)
        await db.job_matches.create_index([("studentId", 1), ("eligibilityStatus", 1)])
        await db.job_matches.create_index([("jobId", 1), ("eligibilityStatus", 1), ("overallMatchScore", -1)])
        await db.job_matches.create_index([("studentId", 1), ("visibleToStudent", 1)])
        await db.job_applications.create_index([("applicationId", 1)], unique=True)
        await db.job_applications.create_index([("studentId", 1), ("appliedAt", -1)])
        await db.job_applications.create_index([("jobId", 1), ("status", 1)])
        await db.audit_logs.create_index([("userId", 1), ("timestamp", -1)])
        await db.audit_logs.create_index([("action", 1), ("timestamp", -1)])
        logger.info("Database indexes created.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")