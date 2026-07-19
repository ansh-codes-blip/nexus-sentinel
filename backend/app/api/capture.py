"""
Packet Capture API & WebSocket
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.capture_manager import capture_manager
import psutil



router = APIRouter()


@router.get("/api/capture/interfaces")
async def get_interfaces():
    """List available network interfaces."""
    interfaces = psutil.net_if_addrs()
    # Return a simplified list
    return [{"name": name, "address": addr.address} for name, addrs in interfaces.items() for addr in addrs if addr.family.name == 'AF_INET']

@router.post("/api/capture/start")
async def start_capture(interface: str = None):
    if capture_manager.is_capturing:
        return {"status": "already_running"}
    capture_manager.start(interface=interface)
    return {"status": "started", "interface": interface or "default"}

@router.post("/api/capture/stop")
async def stop_capture():
    if not capture_manager.is_capturing:
        return {"status": "not_running"}
    capture_manager.stop()
    return {"status": "stopped"}

@router.websocket("/ws/capture")
async def websocket_capture(websocket: WebSocket):
    await capture_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection open
    except WebSocketDisconnect:
        capture_manager.disconnect(websocket)

@router.get("/api/capture/status")
async def get_capture_status():
    return {"is_capturing": capture_manager.is_capturing}