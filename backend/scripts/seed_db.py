"""Seed MongoDB with the synthetic student dataset."""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import motor.motor_asyncio
from scripts.generate_data import generate_all

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "campus_pulse")

async def seed():
    print("[*] Generating synthetic dataset...")
    students = generate_all()
    print(f"[+] Generated {len(students)} students")

    print(f"[*] Connecting to MongoDB: {MONGO_URL}/{DB_NAME}")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Drop and re-create for clean seed
    await db.students.drop()
    print("[*] Dropped existing students collection")

    result = await db.students.insert_many(students)
    print(f"[+] Inserted {len(result.inserted_ids)} students")

    # Create indexes
    await db.students.create_index([("studentId", 1)], unique=True)
    await db.students.create_index([("department", 1), ("semester", 1)])
    await db.students.create_index([("riskLevel", 1)])
    await db.students.create_index([("momentum", 1)])
    await db.students.create_index([("successIndex", -1)])
    print("[+] Indexes created")

    # Stats
    total    = await db.students.count_documents({})
    critical = await db.students.count_documents({"riskLevel":"critical"})
    at_risk  = await db.students.count_documents({"riskLevel":"at_risk"})
    healthy  = await db.students.count_documents({"riskLevel":"healthy"})
    print(f"\n📊 Seeded database stats:")
    print(f"   Total:    {total}")
    print(f"   Healthy:  {healthy}")
    print(f"   At Risk:  {at_risk}")
    print(f"   Critical: {critical}")
    client.close()
    print("\n[DONE] Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
