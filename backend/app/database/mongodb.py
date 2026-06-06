from functools import lru_cache

from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.database import Database

from app.config import get_settings

COLLECTIONS = ("users", "tickets", "knowledge_documents", "audit_logs", "counters")


@lru_cache
def get_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=10,
    )


def get_database() -> Database:
    settings = get_settings()
    return get_client()[settings.mongodb_db_name]


def next_id(name: str) -> int:
    db = get_database()
    doc = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["seq"])


def init_db():
    db = get_database()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.users.create_index([("id", ASCENDING)], unique=True)
    db.tickets.create_index([("id", ASCENDING)], unique=True)
    db.tickets.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.tickets.create_index([("status", ASCENDING)])
    db.knowledge_documents.create_index([("id", ASCENDING)], unique=True)
    db.knowledge_documents.create_index([("filename", ASCENDING)])
    db.audit_logs.create_index([("timestamp", DESCENDING)])


def get_db():
    """FastAPI dependency — yields MongoDB database handle."""
    yield get_database()


def close_client():
    get_client().close()
    get_client.cache_clear()
