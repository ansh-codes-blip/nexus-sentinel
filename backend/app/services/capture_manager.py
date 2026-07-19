"""
Manages the Scapy packet sniffer and WebSocket broadcasting.
"""
import asyncio
import psutil
from typing import List
from fastapi import WebSocket
from scapy.all import AsyncSniffer, IP, TCP, UDP, ICMP, ARP, DNS, DNSQR, Raw
from datetime import datetime
from app.services.threat_engine import threat_engine
from app.services.logger import log_event # Added

def get_active_interface():
    stats = psutil.net_if_stats()
    addrs = psutil.net_if_addrs()
    for name, stat in stats.items():
        if stat.isup and name != 'lo' and not name.startswith(('docker', 'br-', 'veth', 'virbr')):
            if name in addrs:
                for addr in addrs[name]:
                    if addr.family.name == 'AF_INET':
                        return name
    return None

class CaptureManager:
    def __init__(self):
        self.sniffer: AsyncSniffer = None
        self.active_connections: List[WebSocket] = []
        self.is_capturing = False
        self.loop = None
        self.active_iface = get_active_interface()
        print(f"[*] Packet Capture using interface: {self.active_iface}")

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def _process_packet(self, packet):
        try:
            threat_engine.analyze_packet(packet)
        except Exception as e:
            print(f"Threat Engine Error: {e}")
            
        pkt_data = self._format_packet(packet)
        if pkt_data and self.active_connections and self.loop:
            for connection in self.active_connections:
                asyncio.run_coroutine_threadsafe(
                    connection.send_json(pkt_data), 
                    self.loop
                )

    def _format_packet(self, packet):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        if packet.haslayer(IP):
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            proto = "OTHER"
            info = ""
            if packet.haslayer(TCP):
                proto = "TCP"
                sport = packet[TCP].sport
                dport = packet[TCP].dport
                info = f"{sport} → {dport}"
                if packet.haslayer(Raw):
                    try:
                        payload = packet[Raw].load.decode('utf-8', errors='ignore')
                        if 'HTTP' in payload:
                            proto = "HTTP"
                            info = payload.split('\n')[0][:50]
                    except Exception:
                        pass
            elif packet.haslayer(UDP):
                proto = "UDP"
                sport = packet[UDP].sport
                dport = packet[UDP].dport
                info = f"{sport} → {dport}"
                if packet.haslayer(DNS) and packet.haslayer(DNSQR):
                    proto = "DNS"
                    info = f"Query: {packet[DNSQR].qname.decode('utf-8', errors='ignore')}"
            elif packet.haslayer(ICMP):
                proto = "ICMP"
                info = f"Type: {packet[ICMP].type}"
            return {
                "time": timestamp,
                "src": src_ip,
                "dst": dst_ip,
                "proto": proto,
                "length": len(packet),
                "info": info
            }
        elif packet.haslayer(ARP):
            return {
                "time": timestamp,
                "src": packet[ARP].psrc,
                "dst": packet[ARP].pdst,
                "proto": "ARP",
                "length": len(packet),
                "info": f"Who has {packet[ARP].pdst}? Tell {packet[ARP].psrc}"
            }
        return None

    def start(self, interface: str = None):
        if not self.is_capturing:
            try:
                self.is_capturing = True
                iface_to_use = interface or self.active_iface
                self.sniffer = AsyncSniffer(prn=self._process_packet, store=0, iface=iface_to_use)
                self.sniffer.start()
                log_event("INFO", "Capture", f"Packet capture started on interface {iface_to_use}.")
            except Exception as e:
                self.is_capturing = False
                log_event("ERROR", "Capture", f"Failed to start sniffer: {str(e)}")
                print(f"[!] Failed to start sniffer: {e}")

    def stop(self):
        if self.is_capturing and self.sniffer:
            self.sniffer.stop()
            self.is_capturing = False
            log_event("INFO", "Capture", "Packet capture stopped.")

capture_manager = CaptureManager()