"""
Authentication Service for Local Admin Access (Lightweight, built-in Python)
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.user import User

def verify_password(plain_password, hashed_password):
    """Verifies password using SHA-256."""
    hashed_input = hashlib.sha256(plain_password.encode()).hexdigest()
    return secrets.compare_digest(hashed_input, hashed_password)

def get_password_hash(password):
    """Hashes password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token():
    """Creates a simple random session token."""
    return secrets.token_urlsafe(32)

def authenticate_user(db: SessionLocal, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_user_count(db: SessionLocal) -> int:
    return db.query(User).count()