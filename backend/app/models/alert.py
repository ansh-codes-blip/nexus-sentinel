from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from datetime import datetime
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    severity = Column(String(50), index=True) # Critical, High, Medium, Low
    alert_type = Column(String(100)) # e.g., "ARP Spoofing", "Port Scan"
    description = Column(Text)
    source_ip = Column(String(45))
    is_resolved = Column(Boolean, default=False)