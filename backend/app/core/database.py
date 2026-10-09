"""MongoDB async connection using Motor."""
import motor.motor_asyncio
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_db():
    global client, db
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    # Verify connection
    await client.admin.command("ping")
    logger.info(f"✅ Connected to MongoDB database: '{settings.DB_NAME}'")
    # Ensure indexes
    await _create_indexes()


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


async def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    return db


async def _create_indexes():
    """Create compound indexes for performance."""
    try:
        # students
        await db.students.create_index([("studentId", 1)], unique=True)
        await db.students.create_index([("department", 1), ("semester", 1)])
        await db.students.create_index([("streamCode", 1)])
        await db.students.create_index([("graduationYear", 1)])
        await db.students.create_index([("riskLevel", 1)])
        await db.students.create_index([("segment", 1)])
        # predictions
        await db.predictions.create_index([("studentId", 1), ("calculatedAt", -1)])
        await db.predictions.create_index([("riskLevel", 1)])
        # interventions
        await db.interventions.create_index([("studentId", 1), ("status", 1)])
        # jobs
        await db.job_opportunities.create_index([("jobId", 1)], unique=True)
        await db.job_opportunities.create_index([("status", 1)])
        await db.job_opportunities.create_index([("opportunityType", 1)])
        await db.job_opportunities.create_index([("status", 1), ("applicationDeadline", 1)])
        # job matches
        await db.job_matches.create_index([("jobId", 1), ("studentId", 1)], unique=True)
        await db.job_matches.create_index([("studentId", 1), ("eligibilityStatus", 1)])
        await db.job_matches.create_index([("jobId", 1), ("eligibilityStatus", 1), ("overallMatchScore", -1)])
        await db.job_matches.create_index([("studentId", 1), ("visibleToStudent", 1)])
        # job applications
        await db.job_applications.create_index([("applicationId", 1)], unique=True)
        await db.job_applications.create_index([("studentId", 1), ("appliedAt", -1)])
        await db.job_applications.create_index([("jobId", 1), ("status", 1)])
        # audit logs
        await db.audit_logs.create_index([("userId", 1), ("timestamp", -1)])
        await db.audit_logs.create_index([("action", 1), ("timestamp", -1)])
        logger.info("✅ Database indexes created.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
