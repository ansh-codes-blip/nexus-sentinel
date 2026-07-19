from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from app.database import Base

class DnsLog(Base):
    __tablename__ = "dns_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_ip = Column(String(45))
    queried_domain = Column(String(255), index=True)
    is_suspicious = Column(Boolean, default=False)