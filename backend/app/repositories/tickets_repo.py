import re
from datetime import datetime, timezone
from typing import Any

from pymongo.database import Database

from app.database.mongodb import next_id


def _query(filters: dict[str, Any]) -> dict[str, Any]:
    q: dict[str, Any] = {}
    if filters.get("user_id") is not None:
        q["user_id"] = filters["user_id"]
    if filters.get("status"):
        q["status"] = filters["status"]
    if filters.get("priority"):
        q["priority"] = filters["priority"]
    if filters.get("category"):
        q["category"] = filters["category"]
    if filters.get("search"):
        q["title"] = {"$regex": re.escape(filters["search"]), "$options": "i"}
    return q


def find_all(db: Database, filters: dict[str, Any] | None = None) -> list[dict]:
    filters = filters or {}
    cursor = db.tickets.find(_query(filters)).sort("created_at", -1)
    return list(cursor)


def find_by_id(db: Database, ticket_id: int) -> dict | None:
    return db.tickets.find_one({"id": ticket_id})


def create(db: Database, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "id": next_id("tickets"),
        "created_at": now,
        "updated_at": now,
        "messages": [],
        "sources": [],
        "sla_breached": False,
        "feedback_rating": None,
        "resolved_at": None,
        **data,
    }
    db.tickets.insert_one(doc)
    return doc


def update(db: Database, ticket_id: int, updates: dict) -> dict | None:
    updates["updated_at"] = datetime.now(timezone.utc)
    db.tickets.update_one({"id": ticket_id}, {"$set": updates})
    return find_by_id(db, ticket_id)


def add_message(db: Database, ticket_id: int, sender: str, content: str) -> dict | None:
    msg = {
        "id": next_id("ticket_messages"),
        "sender": sender,
        "content": content,
        "created_at": datetime.now(timezone.utc),
    }
    db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return find_by_id(db, ticket_id)


def add_sources(db: Database, ticket_id: int, sources: list[dict]) -> dict | None:
    enriched = []
    for s in sources:
        enriched.append(
            {
                "id": next_id("ticket_sources"),
                "filename": s["filename"],
                "chunk_preview": s["chunk_preview"],
                "relevance_score": s["relevance_score"],
            }
        )
    db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"sources": enriched, "updated_at": datetime.now(timezone.utc)}},
    )
    return find_by_id(db, ticket_id)


def ticket_list_item(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "title": doc["title"],
        "category": doc["category"],
        "priority": doc["priority"],
        "status": doc["status"],
        "sentiment": doc["sentiment"],
        "sla_breached": doc.get("sla_breached", False),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
