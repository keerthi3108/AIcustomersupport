from datetime import datetime, timezone

from pymongo.database import Database

from app.database.mongodb import next_id


def find_by_email(db: Database, email: str) -> dict | None:
    return db.users.find_one({"email": email})


def find_by_id(db: Database, user_id: int) -> dict | None:
    return db.users.find_one({"id": user_id})


def create(db: Database, name: str, email: str, password: str, role: str = "user") -> dict:
    doc = {
        "id": next_id("users"),
        "name": name,
        "email": email,
        "password": password,
        "role": role,
        "created_at": datetime.now(timezone.utc),
    }
    db.users.insert_one(doc)
    return doc


def update(db: Database, user_id: int, updates: dict) -> dict | None:
    db.users.update_one({"id": user_id}, {"$set": updates})
    return find_by_id(db, user_id)
