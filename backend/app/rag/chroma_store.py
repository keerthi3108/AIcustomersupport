from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import get_settings

COLLECTION_NAME = "support_knowledge"


class ChromaStore:
    def __init__(self, persist_path: str):
        path = Path(persist_path)
        path.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(path),
            settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
        )
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def query(self, text: str, top_k: int = 4, category: str | None = None) -> list[dict]:
        if self.collection.count() == 0:
            return []
        where = {"category": category} if category else None
        results = self.collection.query(
            query_texts=[text],
            n_results=min(top_k, max(1, self.collection.count())),
            where=where,
        )
        items = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]
        for doc, meta, dist in zip(docs, metas, dists):
            score = max(0.0, 1.0 - (dist or 1.0))
            items.append(
                {
                    "text": doc,
                    "filename": meta.get("filename", "unknown"),
                    "category": meta.get("category", "General"),
                    "score": round(score, 3),
                }
            )
        return items

    def add_chunks(self, ids: list[str], texts: list[str], metadatas: list[dict]):
        self.collection.add(ids=ids, documents=texts, metadatas=metadatas)

    def delete_by_filename(self, filename: str):
        existing = self.collection.get(where={"filename": filename})
        if existing and existing.get("ids"):
            self.collection.delete(ids=existing["ids"])

    def chunk_count(self) -> int:
        return self.collection.count()

    def document_filenames(self) -> list[str]:
        if self.collection.count() == 0:
            return []
        data = self.collection.get()
        filenames = {m.get("filename") for m in data.get("metadatas", []) if m}
        return sorted(filenames)


@lru_cache(maxsize=1)
def get_chroma_store() -> ChromaStore:
    settings = get_settings()
    return ChromaStore(settings.chroma_path)
