"""
Threat Detection API & WebSocket
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.threat_engine import threat_engine
from app.models.alert import Alert
from app.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()

@router.websocket("/ws/threats")
async def websocket_threats(websocket: WebSocket):
    """Streams real-time threat alerts to the frontend."""
    await threat_engine.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        threat_engine.disconnect(websocket)

@router.get("/api/threats/history")
async def get_threat_history(limit: int = 20, db: Session = Depends(get_db)):
    """Fetch recent alerts from database."""
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
    return {
        "alerts": [
            {
                "timestamp": alert.timestamp.strftime("%H:%M:%S"),
                "severity": alert.severity,
                "alert_type": alert.alert_type,
                "description": alert.description,
                "source_ip": alert.source_ip
            } for alert in alerts
        ]
    }