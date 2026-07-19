"""
Report Generation API
"""
import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from app.services.report_generator import generate_network_report
from app.services.logger import log_event

router = APIRouter()

@router.get("/api/reports/generate")
async def generate_report():
    """Triggers PDF generation and returns the file for download."""
    filepath = generate_network_report()
    if filepath and os.path.exists(filepath):
        return FileResponse(
            path=filepath, 
            filename=os.path.basename(filepath), 
            media_type='application/pdf'
        )
    return {"error": "Failed to generate report"}