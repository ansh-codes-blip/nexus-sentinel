"""
Nexus Sentinel FastAPI Backend
Entry point for the application.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine

# Import models
from app.models.device import Device
from app.models.dns import DnsLog
from app.models.alert import Alert
from app.models.log import SystemLog
from app.models.user import User 

# Import Routers
from app.api.metrics import router as metrics_router
from app.api.capture import router as capture_router
from app.api.devices import router as devices_router
from app.api.scans import router as scans_router
from app.api.dns import router as dns_router
from app.api.ai import router as ai_router
from app.api.threats import router as threats_router
from app.api.logs import router as logs_router
from app.api.reports import router as reports_router
from app.api.auth import router as auth_router

# Import Services
from app.services.capture_manager import capture_manager
from app.services.threat_engine import threat_engine
from app.services.logger import log_event
from app.services.ai_setup import check_and_download_model

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup and shutdown events securely."""
    # --- STARTUP ---
    loop = asyncio.get_running_loop()
    capture_manager.set_loop(loop)
    threat_engine.set_loop(loop)
    print("[*] Event loops synced with background services.")
    log_event("SUCCESS", "System", "Nexus Sentinel backend started successfully.")
    asyncio.create_task(check_and_download_model())
    yield  # Application runs here
    
    # --- SHUTDOWN ---
    if capture_manager.is_capturing:
        capture_manager.stop()
    log_event("INFO", "System", "Nexus Sentinel backend shutting down.")
    print("[*] Background services stopped.")

app = FastAPI(
    title="Nexus Sentinel API", 
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics_router)
app.include_router(capture_router)
app.include_router(devices_router)
app.include_router(scans_router)
app.include_router(dns_router)
app.include_router(ai_router)
app.include_router(threats_router)
app.include_router(logs_router)
app.include_router(reports_router)
app.include_router(auth_router)

@app.get("/api/health")
async def health_check():
    return {"status": "operational", "service": "Nexus Sentinel Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)