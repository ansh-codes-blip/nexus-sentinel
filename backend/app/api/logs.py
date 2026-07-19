"""
System Logs API
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.log import SystemLog
from sqlalchemy import desc

router = APIRouter()

@router.get("/api/logs")
async def get_logs(
    level: str = Query("ALL"),
    search: str = Query(""),
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Fetch system logs with optional filtering."""
    query = db.query(SystemLog)
    
    if level != "ALL":
        query = query.filter(SystemLog.level == level.upper())
        
    if search:
        query = query.filter(
            (SystemLog.message.ilike(f"%{search}%")) | 
            (SystemLog.source.ilike(f"%{search}%"))
        )
    
    logs = query.order_by(desc(SystemLog.timestamp)).limit(limit).all()
    
    return {
        "logs": [
            {
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "level": log.level,
                "source": log.source,
                "message": log.message
            } for log in logs
        ]
    }

@router.delete("/api/logs")
async def clear_logs(db: Session = Depends(get_db)):
    """Clear all system logs."""
    db.query(SystemLog).delete()
    db.commit()
    return {"status": "success", "message": "All logs cleared"}