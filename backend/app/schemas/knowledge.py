from datetime import datetime
from pydantic import BaseModel


class KnowledgeResponse(BaseModel):
    id: int
    filename: str
    category: str
    chunk_count: int
    upload_date: datetime

    class Config:
        from_attributes = True


class KnowledgeStats(BaseModel):
    total_documents: int
    total_chunks: int
    categories: dict[str, int]
