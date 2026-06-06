from types import SimpleNamespace
from typing import Any


def to_user(doc: dict[str, Any] | None) -> SimpleNamespace | None:
    if not doc:
        return None
    return SimpleNamespace(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        password=doc.get("password", ""),
        role=doc["role"],
        created_at=doc.get("created_at"),
    )


def user_public(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "email": doc["email"],
        "role": doc["role"],
        "created_at": doc.get("created_at"),
    }
