from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, index=True, nullable=False)
    mac_address = Column(String(17), index=True)
    hostname = Column(String(255))
    vendor = Column(String(255))
    status = Column(String(50), default="offline")
    device_type = Column(String(50), default="generic")
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)