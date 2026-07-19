"""
Port Scanner API
"""
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.services.scanner import scanner_service
from app.models.device import Device
from app.database import get_db

router = APIRouter()

@router.post("/api/scans/start")
async def start_scan(
    target_ip: str, 
    scan_type: str = "quick", 
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Starts a background Nmap scan."""
    device = db.query(Device).filter(Device.ip_address == target_ip).first()
    if device:
        device.status = "scanning"
        db.commit()

    background_tasks.add_task(scanner_service.run_scan, target_ip, scan_type)
    return {"status": "started", "target": target_ip, "type": scan_type}

@router.get("/api/scans/status")
async def get_scan_status(target_ip: str):
    """Checks the status of a scan."""
    status_data = scanner_service.scan_status.get(target_ip, {"status": "idle", "results": None})
    return status_data