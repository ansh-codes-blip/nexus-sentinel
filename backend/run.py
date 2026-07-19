"""
Production entry point for Nexus Sentinel Backend.
Used by the Electron app to start the server.
"""
import uvicorn
import sys
import os

# Ensure we are in the correct directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the app object directly (PyInstaller-safe)
from app.main import app

if __name__ == "__main__":
    print("[*] Starting Nexus Sentinel Backend for production...")
    # Pass the app object directly, not the string path
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")