from datetime import datetime, timezone

from pymongo.database import Database

from app.database.mongodb import next_id


def find_all(db: Database) -> list[dict]:
    return list(db.knowledge_documents.find().sort("upload_date", -1))


def find_by_id(db: Database, doc_id: int) -> dict | None:
    return db.knowledge_documents.find_one({"id": doc_id})


def find_by_filename(db: Database, filename: str) -> dict | None:
    return db.knowledge_documents.find_one({"filename": filename})


def create(db: Database, filename: str, category: str, chunk_count: int) -> dict:
    doc = {
        "id": next_id("knowledge_documents"),
        "filename": filename,
        "category": category,
        "chunk_count": chunk_count,
        "upload_date": datetime.now(timezone.utc),
    }
    db.knowledge_documents.insert_one(doc)
    return doc


def delete(db: Database, doc_id: int) -> bool:
    result = db.knowledge_documents.delete_one({"id": doc_id})
    return result.deleted_count > 0


def delete_by_filename(db: Database, filename: str):
    db.knowledge_documents.delete_one({"filename": filename})


def stats(db: Database) -> dict:
    docs = find_all(db)
    categories: dict[str, int] = {}
    total_chunks = 0
    for d in docs:
        categories[d["category"]] = categories.get(d["category"], 0) + 1
        total_chunks += d.get("chunk_count", 0)
    return {
        "total_documents": len(docs),
        "total_chunks": total_chunks,
        "categories": categories,
    }
