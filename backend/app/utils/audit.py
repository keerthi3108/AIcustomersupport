from pymongo.database import Database

from app.repositories import audit_repo


def log_action(db: Database, action: str, user_id: int | None = None):
    audit_repo.log(db, action, user_id)
