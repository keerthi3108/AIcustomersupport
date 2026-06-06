from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.auth.jwt import create_access_token
from app.database.mongodb import get_db
from app.repositories import users_repo
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
)
from app.types import user_public
from app.utils.audit import log_action
from app.utils.security import hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=Token)
def register(payload: RegisterRequest, db: Database = Depends(get_db)):
    if users_repo.find_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = users_repo.create(
        db,
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role="user",
    )
    log_action(db, f"User registered: {user['email']}", user["id"])
    token = create_access_token(user["email"], user["role"])
    return Token(access_token=token, user=UserResponse(**user_public(user)))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Database = Depends(get_db)):
    user = users_repo.find_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    log_action(db, f"User login: {user['email']}", user["id"])
    token = create_access_token(user["email"], user["role"])
    return Token(access_token=token, user=UserResponse(**user_public(user)))


@router.post("/admin-login", response_model=Token)
def admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    user = users_repo.find_by_email(db, payload.email)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    log_action(db, f"Admin login: {user['email']}", user["id"])
    token = create_access_token(user["email"], user["role"])
    return Token(access_token=token, user=UserResponse(**user_public(user)))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Database = Depends(get_db)):
    user = users_repo.find_by_email(db, payload.email)
    if user:
        log_action(db, f"Password reset requested: {user['email']}", user["id"])
    return {
        "message": "If an account exists for this email, password reset instructions have been sent."
    }
