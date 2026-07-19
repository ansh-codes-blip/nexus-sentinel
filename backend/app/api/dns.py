"""
DNS Monitor API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.dns_monitor import dns_monitor_service
from app.models.dns import DnsLog
from sqlalchemy import func, desc

router = APIRouter()

@router.post("/api/dns/start")
async def start_dns_monitor():
    if dns_monitor_service.is_running:
        return {"status": "already_running"}
    dns_monitor_service.start()
    return {"status": "started"}

@router.post("/api/dns/stop")
async def stop_dns_monitor():
    if not dns_monitor_service.is_running:
        return {"status": "not_running"}
    dns_monitor_service.stop()
    return {"status": "stopped"}

@router.get("/api/dns/status")
async def get_dns_status():
    return {"is_running": dns_monitor_service.is_running}

@router.get("/api/dns/logs")
async def get_dns_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Fetch recent DNS logs."""
    logs = db.query(DnsLog).order_by(DnsLog.timestamp.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "timestamp": log.timestamp.strftime("%H:%M:%S"),
                "source_ip": log.source_ip,
                "domain": log.queried_domain,
                "is_suspicious": log.is_suspicious
            } for log in logs
        ]
    }

@router.get("/api/dns/stats")
async def get_dns_stats(db: Session = Depends(get_db)):
    """Fetch top queried domains."""
    top_domains = db.query(
        DnsLog.queried_domain, 
        func.count(DnsLog.queried_domain).label('count')
    ).group_by(DnsLog.queried_domain).order_by(desc('count')).limit(5).all()
    
    return {
        "top_domains": [{"domain": d[0], "count": d[1]} for d in top_domains]
    }