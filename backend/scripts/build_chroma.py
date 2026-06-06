"""
Run locally to build the ChromaDB vector store before deployment.
Usage (from backend/): python scripts/build_chroma.py
Requires: pip install chromadb pypdf (already in requirements.txt)
"""
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.rag.chroma_store import ChromaStore  # noqa: E402
from app.rag.document_processor import chunk_text, extract_text_from_file  # noqa: E402

KB_DIR = ROOT.parent / "docs" / "knowledge_base"
CHROMA_PATH = ROOT / "chroma_db"

CATEGORY_MAP = {
    "billing": "Billing",
    "technical": "Technical",
    "account": "Account",
    "general": "General",
}


def detect_category(filename: str, text: str) -> str:
    lower = (filename + " " + text[:500]).lower()
    if "billing" in lower or "payment" in lower or "invoice" in lower:
        return "Billing"
    if "account" in lower or "login" in lower or "password" in lower:
        return "Account"
    if "technical" in lower or "api" in lower or "integration" in lower:
        return "Technical"
    return "General"


def main():
    if not KB_DIR.exists():
        print(f"Knowledge base folder not found: {KB_DIR}")
        sys.exit(1)

    store = ChromaStore(str(CHROMA_PATH))
    try:
        store.client.delete_collection("support_knowledge")
    except Exception:
        pass
    store = ChromaStore(str(CHROMA_PATH))

    files = list(KB_DIR.glob("*.txt")) + list(KB_DIR.glob("*.md")) + list(KB_DIR.glob("*.pdf"))
    total_chunks = 0

    for path in sorted(files):
        text = extract_text_from_file(path)
        chunks = chunk_text(text)
        category = detect_category(path.name, text)
        ids, texts, metas = [], [], []
        for i, chunk in enumerate(chunks):
            ids.append(f"{path.stem}_{uuid.uuid4().hex[:8]}_{i}")
            texts.append(chunk)
            metas.append({"filename": path.name, "category": category})
        if ids:
            store.add_chunks(ids, texts, metas)
            total_chunks += len(ids)
            print(f"  + {path.name}: {len(ids)} chunks ({category})")

    print(f"\nDone. {len(files)} documents, {total_chunks} chunks in {CHROMA_PATH}")


if __name__ == "__main__":
    main()
