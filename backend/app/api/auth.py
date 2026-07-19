"""
Authentication API (Simplified Auto-Create)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import (
    get_password_hash, 
    create_access_token, 
    verify_password
)
from app.models.user import User
from app.services.logger import log_event

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

@router.post("/api/auth/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    """Logs in existing user, or creates new user if they don't exist."""
    
    db_user = db.query(User).filter(User.username == user.username).first()
    
    # 1. User exists -> Verify Password
    if db_user:
        if not verify_password(user.password, db_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")
        log_event("INFO", "Auth", f"User '{user.username}' logged in.")
        
    # 2. User doesn't exist -> Create them instantly
    else:
        hashed_password = get_password_hash(user.password)
        db_user = User(username=user.username, hashed_password=hashed_password, is_admin=True)
        db.add(db_user)
        db.commit()
        log_event("SUCCESS", "Auth", f"New admin user '{user.username}' created.")

    # 3. Return Token
    access_token = create_access_token()
    return {"access_token": access_token, "token_type": "bearer"}