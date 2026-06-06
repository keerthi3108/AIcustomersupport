import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database.mongodb import get_database, init_db
from app.repositories import users_repo
from app.routes import api_router
from app.utils.security import hash_password


def seed_admin():
    settings = get_settings()
    db = get_database()
    if not users_repo.find_by_email(db, settings.admin_email):
        users_repo.create(
            db,
            name=settings.admin_name,
            email=settings.admin_email,
            password=hash_password(settings.admin_password),
            role="admin",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(get_settings().upload_dir).mkdir(parents=True, exist_ok=True)
    Path(get_settings().chroma_path).mkdir(parents=True, exist_ok=True)
    init_db()
    seed_admin()
    yield


app = FastAPI(
    title="AI Customer Support Platform",
    version="1.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/health")
def health():
    db_ok = False
    try:
        get_database().command("ping")
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "service": "ticket-rag-api",
        "mongodb": "connected" if db_ok else "disconnected",
        "chroma": "enabled",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
