from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.auth.dependencies import get_current_user
from app.database.mongodb import get_db
from app.repositories import users_repo
from app.schemas.auth import PasswordChangeRequest, UserResponse, UserUpdate
from app.types import user_public
from app.utils.audit import log_action
from app.utils.security import hash_password, verify_password

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_profile(user=Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )


@router.put("/me", response_model=UserResponse)
def update_profile(
    payload: UserUpdate,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.email and payload.email != user.email:
        if users_repo.find_by_email(db, payload.email):
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = payload.email
    if not updates:
        doc = users_repo.find_by_id(db, user.id)
    else:
        doc = users_repo.update(db, user.id, updates)
    log_action(db, f"Profile updated: {doc['email']}", user.id)
    return UserResponse(**user_public(doc))


@router.post("/me/change-password")
def change_password(
    payload: PasswordChangeRequest,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    doc = users_repo.find_by_id(db, user.id)
    if not doc or not verify_password(payload.current_password, doc["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    users_repo.update(db, user.id, {"password": hash_password(payload.new_password)})
    log_action(db, f"Password changed: {user.email}", user.id)
    return {"message": "Password updated successfully"}
