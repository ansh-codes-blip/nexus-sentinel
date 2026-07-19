"""
Real-Time Threat Detection Engine (v1.1).
Analyzes packets for ARP Spoofing, Port Scans, SYN Floods, ICMP Floods, DNS Floods, and Metasploit.
"""
import time
import asyncio
from collections import defaultdict, deque
from typing import List
from fastapi import WebSocket
from scapy.all import IP, TCP, ARP, UDP, ICMP, DNS, DNSQR
from app.database import SessionLocal
from app.models.alert import Alert
from datetime import datetime
from app.services.logger import log_event

class ThreatEngine:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None
        
        self.arp_table = {}
        self.syn_counts = defaultdict(deque)
        self.port_scan_counts = defaultdict(deque)
        self.icmp_counts = defaultdict(deque)   # New
        self.dns_counts = defaultdict(deque)    # New
        
        self.SYN_FLOOD_THRESHOLD = 50
        self.PORT_SCAN_THRESHOLD = 20
        self.ICMP_FLOOD_THRESHOLD = 40  # 40 pings in 2 seconds
        self.DNS_FLOOD_THRESHOLD = 30  # 30 DNS queries in 2 seconds

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def log_alert(self, severity: str, alert_type: str, description: str, source_ip: str):
        print(f"[!] THREAT DETECTED: [{severity}] {alert_type} from {source_ip}")
        log_event("WARNING", "ThreatEngine", f"{alert_type} detected from {source_ip}: {description}")
        
        db = SessionLocal()
        try:
            alert = Alert(
                severity=severity,
                alert_type=alert_type,
                description=description,
                source_ip=source_ip
            )
            db.add(alert)
            db.commit()
        except Exception as e:
            print(f"Error saving alert: {e}")
        finally:
            db.close()
            
        alert_data = {
            "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
            "severity": severity,
            "alert_type": alert_type,
            "description": description,
            "source_ip": source_ip
        }
        
        if self.active_connections and self.loop:
            for connection in self.active_connections:
                asyncio.run_coroutine_threadsafe(
                    connection.send_json(alert_data), 
                    self.loop
                )

    def analyze_packet(self, packet):
        current_time = time.time()

        # 1. ARP Spoofing Detection
        if packet.haslayer(ARP):
            arp_layer = packet[ARP]
            ip = arp_layer.psrc
            mac = arp_layer.hwsrc
            
            if ip in self.arp_table:
                if self.arp_table[ip] != mac:
                    self.log_alert(
                        severity="High",
                        alert_type="ARP Spoofing",
                        description=f"IP {ip} changed MAC from {self.arp_table[ip]} to {mac}",
                        source_ip=ip
                    )
            self.arp_table[ip] = mac

        elif packet.haslayer(IP):
            ip_layer = packet[IP]
            src_ip = ip_layer.src

            # 2. ICMP Flood Detection
            if packet.haslayer(ICMP):
                self.icmp_counts[src_ip].append(current_time)
                while self.icmp_counts[src_ip] and self.icmp_counts[src_ip][0] < current_time - 2:
                    self.icmp_counts[src_ip].popleft()
                
                if len(self.icmp_counts[src_ip]) > self.ICMP_FLOOD_THRESHOLD:
                    self.log_alert(
                        severity="High",
                        alert_type="ICMP Flood (Ping Flood)",
                        description=f"Excessive ICMP packets ({len(self.icmp_counts[src_ip])}) from {src_ip}",
                        source_ip=src_ip
                    )
                    self.icmp_counts[src_ip].clear()

            # 3. DNS Query Flood Detection
            elif packet.haslayer(UDP) and packet.haslayer(DNS) and packet.haslayer(DNSQR):
                if packet[DNS].qr == 0: # It's a query
                    self.dns_counts[src_ip].append(current_time)
                    while self.dns_counts[src_ip] and self.dns_counts[src_ip][0] < current_time - 2:
                        self.dns_counts[src_ip].popleft()
                    
                    if len(self.dns_counts[src_ip]) > self.DNS_FLOOD_THRESHOLD:
                        self.log_alert(
                            severity="Medium",
                            alert_type="DNS Query Flood",
                            description=f"Excessive DNS queries ({len(self.dns_counts[src_ip])}) from {src_ip}. Potential malware beaconing.",
                            source_ip=src_ip
                        )
                        self.dns_counts[src_ip].clear()

            # 4. TCP Threats (SYN Flood, Port Scan, Metasploit)
            elif packet.haslayer(TCP):
                tcp_layer = packet[TCP]
                dst_port = tcp_layer.dport
                flags = tcp_layer.flags
                
                # Metasploit Default Shell (Port 4444)
                if dst_port == 4444 and flags == 'S':
                    self.log_alert(
                        severity="Critical",
                        alert_type="Metasploit Beaconing",
                        description=f"Connection attempt to port 4444 (Metasploit default) from {src_ip}",
                        source_ip=src_ip
                    )

                if flags == 'S':
                    self.syn_counts[src_ip].append(current_time)
                    while self.syn_counts[src_ip] and self.syn_counts[src_ip][0] < current_time - 2:
                        self.syn_counts[src_ip].popleft()
                        
                    if len(self.syn_counts[src_ip]) > self.SYN_FLOOD_THRESHOLD:
                        self.log_alert(
                            severity="Critical",
                            alert_type="SYN Flood Attack",
                            description=f"Excessive SYN packets ({len(self.syn_counts[src_ip])}) from {src_ip}",
                            source_ip=src_ip
                        )
                        self.syn_counts[src_ip].clear() 

                self.port_scan_counts[src_ip].append((current_time, dst_port))
                while self.port_scan_counts[src_ip] and self.port_scan_counts[src_ip][0][0] < current_time - 5:
                    self.port_scan_counts[src_ip].popleft()
                    
                unique_ports = set(port for _, port in self.port_scan_counts[src_ip])
                if len(unique_ports) > self.PORT_SCAN_THRESHOLD:
                    self.log_alert(
                        severity="High",
                        alert_type="Port Scan Detected",
                        description=f"Scanned {len(unique_ports)} ports in 5s from {src_ip}",
                        source_ip=src_ip
                    )
                    self.port_scan_counts[src_ip].clear()

threat_engine = ThreatEngine()