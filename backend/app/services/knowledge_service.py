import uuid
from pathlib import Path

from pymongo.database import Database

from app.config import get_settings
from app.rag.chroma_store import get_chroma_store
from app.rag.document_processor import chunk_text, extract_text_from_file
from app.repositories import knowledge_repo
from app.utils.audit import log_action


def ingest_document(
    db: Database, file_path: Path, filename: str, category: str, user_id: int
) -> dict:
    text = extract_text_from_file(file_path)
    chunks = chunk_text(text)
    store = get_chroma_store()
    store.delete_by_filename(filename)

    ids, texts, metas = [], [], []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{filename}_{uuid.uuid4().hex[:8]}_{i}"
        ids.append(chunk_id)
        texts.append(chunk)
        metas.append({"filename": filename, "category": category})

    if ids:
        store.add_chunks(ids, texts, metas)

    knowledge_repo.delete_by_filename(db, filename)
    doc = knowledge_repo.create(db, filename, category, len(chunks))
    log_action(db, f"Knowledge uploaded: {filename}", user_id)
    return doc


def delete_document(db: Database, doc: dict, user_id: int):
    store = get_chroma_store()
    store.delete_by_filename(doc["filename"])
    upload_path = Path(get_settings().upload_dir) / doc["filename"]
    if upload_path.exists():
        upload_path.unlink()
    knowledge_repo.delete(db, doc["id"])
    log_action(db, f"Knowledge deleted: {doc['filename']}", user_id)


def knowledge_stats(db: Database) -> dict:
    return knowledge_repo.stats(db)
