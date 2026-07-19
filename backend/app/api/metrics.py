"""
System Metrics API & WebSocket
"""
import psutil
import asyncio
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

router = APIRouter()

def get_active_interface():
    """Find the first active physical network interface."""
    stats = psutil.net_if_stats()
    addrs = psutil.net_if_addrs()
    for name, stat in stats.items():
        # Filter out loopback and virtual interfaces
        if stat.isup and name != 'lo' and not name.startswith(('docker', 'br-', 'veth', 'virbr')):
            # Ensure it has an IPv4 address
            if name in addrs:
                for addr in addrs[name]:
                    if addr.family.name == 'AF_INET':
                        return name
    return None

@router.get("/api/metrics/system")
async def get_system_metrics():
    return {
        "cpu_usage": psutil.cpu_percent(interval=None),
        "ram_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
    }

@router.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """Stream system metrics and real bandwidth every 2 seconds."""
    await websocket.accept()
    
    active_iface = get_active_interface()
    print(f"[*] Monitoring bandwidth on interface: {active_iface}")
    
    def get_iface_bytes():
        if active_iface:
            io = psutil.net_io_counters(pernic=True).get(active_iface)
            if io:
                return io.bytes_sent, io.bytes_recv
        # Fallback to all interfaces if specific one not found
        io_all = psutil.net_io_counters()
        return io_all.bytes_sent, io_all.bytes_recv

    prev_bytes_sent, prev_bytes_recv = get_iface_bytes()
    prev_time = time.time()
    
    # Initialize CPU monitoring
    psutil.cpu_percent(interval=None)

    try:
        while True:
            if websocket.client_state != WebSocketState.CONNECTED:
                break

            curr_time = time.time()
            curr_bytes_sent, curr_bytes_recv = get_iface_bytes()
            
            time_delta = curr_time - prev_time
            if time_delta == 0:
                time_delta = 1 # Prevent division by zero

            upload_speed = (curr_bytes_sent - prev_bytes_sent) / time_delta / 1024
            download_speed = (curr_bytes_recv - prev_bytes_recv) / time_delta / 1024

            prev_bytes_sent = curr_bytes_sent
            prev_bytes_recv = curr_bytes_recv
            prev_time = curr_time

            # Non-blocking CPU calculation
            curr_cpu = psutil.cpu_percent(interval=None)
            
            metrics = {
                "cpu_usage": curr_cpu,
                "ram_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                # Speeds are in Kilobytes per second (KB/s)
                "upload_speed": round(max(0, upload_speed), 2),
                "download_speed": round(max(0, download_speed), 2)
            }
            
            await websocket.send_json(metrics)
            await asyncio.sleep(2)
            
    except WebSocketDisconnect:
        pass
    except Exception:
        pass