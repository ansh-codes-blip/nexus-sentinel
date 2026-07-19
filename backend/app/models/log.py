from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.database import Base

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String(20), index=True) # INFO, WARNING, ERROR, SUCCESS
    source = Column(String(50)) # e.g., "System", "Scanner", "Capture"
    message = Column(Text)