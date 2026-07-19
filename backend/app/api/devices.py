"""
Device Discovery API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.discovery import discovery_service
from app.models.device import Device

router = APIRouter()

def device_to_dict(d: Device):
    return {
        "id": d.id,
        "ip_address": d.ip_address,
        "hostname": d.hostname,
        "mac_address": d.mac_address,
        "vendor": d.vendor,
        "status": d.status,
        "device_type": d.device_type
    }

@router.get("/api/devices")
async def get_devices(db: Session = Depends(get_db)):
    """Fetch all known devices from database."""
    devices = db.query(Device).all()
    return {"status": "success", "devices": [device_to_dict(d) for d in devices]}

@router.get("/api/devices/scan")
async def scan_devices(db: Session = Depends(get_db)):
    """Trigger a network scan, persist results, and return all devices."""
    try:
        devices = discovery_service.scan_network(db)
        return {"status": "success", "devices": [device_to_dict(d) for d in devices]}
    except Exception as e:
        print(f"Error during scan: {e}")
        return {"status": "error", "message": str(e)}