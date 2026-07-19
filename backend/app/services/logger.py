"""
Centralized Logging Utility.
"""
from app.database import SessionLocal
from app.models.log import SystemLog

def log_event(level: str, source: str, message: str):
    """Saves an event to the database."""
    db = SessionLocal()
    try:
        log = SystemLog(
            level=level.upper(),
            source=source,
            message=message
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to write to system log: {e}")
    finally:
        db.close()