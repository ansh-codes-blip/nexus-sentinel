"""
AI Assistant API & WebSocket (Context-Aware)
"""
import httpx
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from app.database import SessionLocal
from app.models.alert import Alert
from app.models.device import Device
from sqlalchemy import desc

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma:2b" 
SYSTEM_PROMPT = "You are Nexus Sentinel AI, a professional cybersecurity assistant. Be very concise and accurate. If the user asks about recent threats or network status, use the provided context."

def get_network_context():
    """Fetches recent alerts and device count to give the AI context."""
    db = SessionLocal()
    try:
        latest_alert = db.query(Alert).order_by(desc(Alert.timestamp)).first()
        device_count = db.query(Device).filter(Device.status == "online").count()
        
        context = f"Network Context: There are currently {device_count} devices online. "
        if latest_alert:
            context += f"The most recent security alert was '{latest_alert.alert_type}' (Severity: {latest_alert.severity}) from IP {latest_alert.source_ip} at {latest_alert.timestamp.strftime('%H:%M:%S')}. Description: {latest_alert.description}"
        else:
            context += "There are no recent security alerts. The network is nominal."
            
        return context
    finally:
        db.close()

@router.websocket("/ws/ai")
async def websocket_ai(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            user_message = await websocket.receive_text()
            
            # 1. Get real-time network context
            context = get_network_context()
            
            # 2. Construct context-aware prompt
            full_prompt = f"{context}\n\nUser Question: {user_message}"
            
            payload = {
                "model": MODEL_NAME,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": full_prompt}
                ],
                "stream": True
            }
            
            try:
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", OLLAMA_URL, json=payload, timeout=60.0) as response:
                        async for line in response.aiter_lines():
                            if line:
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    chunk = data["message"]["content"]
                                    if chunk:
                                        await websocket.send_json({"type": "chunk", "content": chunk})
                                if data.get("done"):
                                    await websocket.send_json({"type": "done"})
                                    break
            except httpx.ConnectError:
                await websocket.send_json({"type": "error", "content": "Ollama is not running. Please start it."})
                await websocket.send_json({"type": "done"})
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"AI WebSocket Error: {e}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({"type": "error", "content": str(e)})
            await websocket.send_json({"type": "done"})