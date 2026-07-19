"""
Network Device Discovery Service using python-nmap.
"""
import nmap
import socket
import scapy.all as scapy
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.device import Device
from app.services.logger import log_event # Added

class DiscoveryService:
    def __init__(self):
        self.nm = nmap.PortScanner()

    def get_local_subnet(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('10.255.255.255', 1))
            my_ip = s.getsockname()[0]
        except Exception:
            my_ip = '127.0.0.1'
        finally:
            s.close()
            
        ip_parts = my_ip.split('.')
        if len(ip_parts) == 4:
            return f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.0/24"
        return "192.168.1.0/24"

    def get_gateway_ip(self):
        """Gets the default gateway IP using Scapy's routing table."""
        try:
            return scapy.conf.route.route("0.0.0.0")[2]
        except:
            return None

    def scan_network(self, db: Session):
        """Scans network, updates database, and returns all known devices."""
        subnet = self.get_local_subnet()
        gateway_ip = self.get_gateway_ip()
        print(f"[*] Scanning subnet: {subnet}. Gateway: {gateway_ip}")
        log_event("INFO", "Discovery", f"Initiating network scan on subnet {subnet}.")
        
        db.query(Device).update({Device.status: "offline"})
        
        self.nm.scan(hosts=subnet, arguments='-sn -PR')
        
        live_hosts = self.nm.all_hosts()
        now = datetime.utcnow()
        
        for host in live_hosts:
            hostname = self.nm[host].hostname() or "Unknown"
            mac = self.nm[host]['addresses'].get('mac', 'Unknown')
            vendor = "Unknown"
            
            if 'vendor' in self.nm[host] and self.nm[host]['vendor']:
                vendor = list(self.nm[host]['vendor'].values())[0]
            
            db_device = db.query(Device).filter(
                (Device.ip_address == host) | (Device.mac_address == mac and mac != "Unknown")
            ).first()
            
            # Classify device type
            device_type = "generic"
            if host == gateway_ip:
                device_type = "router"
            elif any(x in vendor.lower() for x in ['apple', 'samsung', 'xiaomi', 'motorola', 'oneplus']):
                device_type = "phone"
            elif any(x in vendor.lower() for x in ['asus', 'dell', 'hp', 'lenovo', 'intel']):
                device_type = "laptop"
            
            if db_device:
                db_device.status = "online"
                db_device.last_seen = now
                db_device.hostname = hostname
                db_device.vendor = vendor
                db_device.device_type = device_type
                if mac != "Unknown":
                    db_device.mac_address = mac
            else:
                new_device = Device(
                    ip_address=host,
                    hostname=hostname,
                    mac_address=mac,
                    vendor=vendor,
                    status="online",
                    device_type=device_type,
                    first_seen=now,
                    last_seen=now
                )
                db.add(new_device)
                
        db.commit()
        log_event("SUCCESS", "Discovery", f"Network scan complete. Found {len(live_hosts)} live hosts.")
        return db.query(Device).order_by(Device.status.desc(), Device.ip_address.asc()).all()

discovery_service = DiscoveryService()