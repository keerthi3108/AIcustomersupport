"""Sync KnowledgeDocument records in MongoDB from docs/knowledge_base."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.database.mongodb import get_database, init_db
from app.rag.chroma_store import ChromaStore
from app.rag.document_processor import chunk_text, extract_text_from_file
from app.repositories import knowledge_repo

KB_DIR = ROOT.parent / "docs" / "knowledge_base"
CHROMA_PATH = ROOT / "chroma_db"


def main():
    init_db()
    db = get_database()
    store = ChromaStore(str(CHROMA_PATH))

    for doc in knowledge_repo.find_all(db):
        knowledge_repo.delete(db, doc["id"])

    files = sorted(KB_DIR.glob("*.txt"))
    for path in files:
        text = extract_text_from_file(path)
        chunks = chunk_text(text)
        category = "General"
        lower = path.name.lower()
        if "billing" in lower:
            category = "Billing"
        elif "account" in lower:
            category = "Account"
        elif "technical" in lower:
            category = "Technical"
        knowledge_repo.create(db, path.name, category, len(chunks))
        print(f"  + {path.name} ({category}, {len(chunks)} chunks)")

    print(f"\nSeeded {len(files)} documents. Chroma chunks: {store.chunk_count()}")


if __name__ == "__main__":
    main()
