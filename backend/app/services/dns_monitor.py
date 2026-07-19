"""
Background DNS Monitoring Service using Scapy.
"""
import scapy.all as scapy
from app.database import SessionLocal
from app.models.dns import DnsLog

class DnsMonitorService:
    def __init__(self):
        self.sniffer = None
        self.is_running = False

    def start(self):
        if not self.is_running:
            self.is_running = True
            # Filter specifically for UDP port 53 (DNS)
            self.sniffer = scapy.AsyncSniffer(filter="udp port 53", prn=self.process_packet, store=0)
            self.sniffer.start()
            print("[*] DNS Monitor started.")

    def stop(self):
        if self.is_running and self.sniffer:
            self.sniffer.stop()
            self.is_running = False
            print("[*] DNS Monitor stopped.")

    def is_suspicious(self, domain: str) -> bool:
        """Basic heuristic threat intelligence."""
        domain = domain.lower()
        # 1. Very long domains (often used by malware to bypass filters)
        if len(domain) > 50:
            return True
        # 2. Known suspicious TLDs often associated with malware
        suspicious_tlds = ['.xyz', '.top', '.work', '.click', '.loan', '.country', '.stream']
        if any(domain.endswith(tld) for tld in suspicious_tlds):
            return True
        # 3. High entropy/random looking subdomains (basic check)
        parts = domain.split('.')
        if len(parts) > 3 and any(len(p) > 20 and p.isalnum() for p in parts):
            return True
            
        return False

    def process_packet(self, packet):
        """Callback for Scapy. Parses DNS query and logs to DB."""
        # qr == 0 means it's a Query (1 is Response)
        if packet.haslayer(scapy.DNS) and packet.getlayer(scapy.DNS).qr == 0:
            if packet.haslayer(scapy.DNSQR):
                try:
                    domain = packet[scapy.DNSQR].qname.decode('utf-8', errors='ignore').rstrip('.')
                    src_ip = packet[scapy.IP].src if packet.haslayer(scapy.IP) else "Unknown"
                    
                    suspicious = self.is_suspicious(domain)
                    
                    # Use a new DB session for this thread
                    db = SessionLocal()
                    try:
                        log_entry = DnsLog(
                            source_ip=src_ip,
                            queried_domain=domain,
                            is_suspicious=suspicious
                        )
                        db.add(log_entry)
                        db.commit()
                    except Exception as e:
                        print(f"DB Error logging DNS: {e}")
                    finally:
                        db.close()
                except Exception:
                    pass # Ignore malformed packets

dns_monitor_service = DnsMonitorService()