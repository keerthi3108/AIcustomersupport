from datetime import datetime, timezone

from pymongo.database import Database

from app.database.mongodb import next_id


def log(db: Database, action: str, user_id: int | None = None):
    db.audit_logs.insert_one(
        {
            "id": next_id("audit_logs"),
            "action": action,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc),
        }
    )
