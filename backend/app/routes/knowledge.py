import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pymongo.database import Database

from app.auth.dependencies import require_admin
from app.config import get_settings
from app.database.mongodb import get_db
from app.repositories import knowledge_repo
from app.schemas.knowledge import KnowledgeResponse, KnowledgeStats
from app.services.knowledge_service import delete_document, ingest_document, knowledge_stats

router = APIRouter()


@router.get("", response_model=list[KnowledgeResponse])
def list_documents(admin=Depends(require_admin), db: Database = Depends(get_db)):
    return [KnowledgeResponse(**d) for d in knowledge_repo.find_all(db)]


@router.get("/stats", response_model=KnowledgeStats)
def stats(admin=Depends(require_admin), db: Database = Depends(get_db)):
    return KnowledgeStats(**knowledge_stats(db))


@router.post("/upload", response_model=KnowledgeResponse)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("General"),
    admin=Depends(require_admin),
    db: Database = Depends(get_db),
):
    if category not in ("Billing", "Technical", "Account", "General"):
        category = "General"
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".pdf", ".txt", ".md"):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, MD files allowed")

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "document").name
    dest = upload_dir / safe_name

    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = ingest_document(db, dest, safe_name, category, admin.id)
    return KnowledgeResponse(**doc)


@router.delete("/{doc_id}")
def remove_document(
    doc_id: int,
    admin=Depends(require_admin),
    db: Database = Depends(get_db),
):
    doc = knowledge_repo.find_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_document(db, doc, admin.id)
    return {"message": "Document deleted"}
