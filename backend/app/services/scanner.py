"""
Advanced Port & Vulnerability Scanning Service.
Uses Nmap NSE (vulners) to find actual CVEs and provides remediation advice.
"""
import subprocess
import xml.etree.ElementTree as ET
import re
import os
from typing import Dict, Any, List
from app.services.logger import log_event
from app.services.threat_engine import threat_engine # Added for alerting

# Known high-risk ports and their security implications
RISK_PROFILES = {
    21: {"level": "High", "note": "FTP (Cleartext). Potential anonymous access."},
    23: {"level": "Critical", "note": "Telnet. Unencrypted. High risk of credential sniffing."},
    139: {"level": "High", "note": "NetBIOS. Often exposes sensitive system info."},
    445: {"level": "Critical", "note": "SMB. High risk for ransomware (EternalBlue)."},
    3389: {"level": "Critical", "note": "RDP. High risk for brute force and BlueKeep."}
}

# Expert Remediation Advice Database
REMEDIATION_DB = {
    "upnp": "Disable UPnP (Universal Plug and Play) in your router settings immediately. It allows malware to open firewall ports automatically.",
    "telnet": "Disable Telnet entirely. Use SSH (Port 22) for encrypted remote access.",
    "ftp": "Disable Anonymous FTP. Use SFTP or FTPS. If FTP is required, enforce strong passwords and restrict IP access.",
    "smb": "Ensure SMBv1 is disabled. Apply the latest Windows security updates to prevent ransomware (EternalBlue/EternalDarkness).",
    "rdp": "Disable RDP if not actively used. If required, enable Network Level Authentication (NLA) and restrict access via a VPN.",
    "http": "Enforce HTTPS (TLS 1.2+). Update the web server (Apache/Nginx) to the latest stable version.",
    "ssh": "Disable password authentication and use SSH keys. Change the default port from 22 if possible.",
    "mysql": "Restrict MySQL to only listen on localhost (127.0.0.1). Do not expose database ports to the LAN.",
    "redis": "Require authentication in redis.conf. Bind Redis to localhost only."
}

class ScannerService:
    def __init__(self):
        self.scan_status: Dict[str, Dict[str, Any]] = {}

    def parse_vulners_output(self, script_output: str) -> List[Dict[str, Any]]:
        """Parses the raw text output from the Nmap vulners script."""
        vulns = []
        pattern = re.compile(r'(CVE-\d{4}-\d+)\s+([\d\.]+)\s+(https?://\S+)')
        for match in pattern.finditer(script_output):
            vulns.append({
                "cve_id": match.group(1),
                "cvss_score": float(match.group(2)),
                "reference": match.group(3)
            })
        return vulns

    def run_scan(self, target_ip: str, scan_type: str):
        target_ip = str(target_ip)
        self.scan_status[target_ip] = {"status": "scanning", "results": None}
        
        # Define advanced argument profiles
        if scan_type == "cve":
            args = ["nmap", "-sV", "-T4", "-Pn", "--script", "vulners", "-oX", "-"]
            profile_name = "Service & CVE Detection"
        elif scan_type == "udp":
            args = ["nmap", "-sU", "-F", "-T4", "-Pn", "-oX", "-"]
            profile_name = "UDP Service Discovery"
        elif scan_type == "evasion":
            args = ["nmap", "-sS", "-f", "--scan-delay", "200ms", "-T2", "-Pn", "-oX", "-"]
            profile_name = "Firewall Evasion (Stealth)"
        elif scan_type == "web":
            args = ["nmap", "-p", "80,443,8080,8443", "-sV", "--script", "http-enum,http-headers,http-methods,http-shellshock", "-Pn", "-oX", "-"]
            profile_name = "Web Application Exploit"
        elif scan_type == "os":
            if os.geteuid() != 0:
                self.scan_status[target_ip] = {"status": "error", "results": "OS Detection requires root privileges."}
                return
            args = ["nmap", "-O", "--osscan-guess", "-T4", "-Pn", "-oX", "-"]
            profile_name = "OS Fingerprint"
        elif scan_type == "deep":
            if os.geteuid() != 0:
                self.scan_status[target_ip] = {"status": "error", "results": "Deep Aggressive Scan requires root privileges."}
                return
            args = ["nmap", "-A", "-T4", "-Pn", "-oX", "-"]
            profile_name = "Deep Aggressive (Identify Unknown)"
        else:
            args = ["nmap", "-T4", "-F", "-Pn", "-oX", "-"]
            profile_name = "Basic Scan"

        args.append(target_ip)
        
        try:
            log_event("INFO", "Scanner", f"Starting {profile_name} scan on {target_ip}.")
            print(f"[*] Executing {profile_name} on {target_ip}...")
            result = subprocess.run(args, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                err_msg = result.stderr.strip() or "Unknown Nmap error"
                print(f"[!] Nmap failed: {err_msg}")
                self.scan_status[target_ip] = {"status": "error", "results": err_msg}
                log_event("ERROR", "Scanner", f"Scan failed on {target_ip}: {err_msg}")
                return
                
            # Parse the XML output from the subprocess result
            root = ET.fromstring(result.stdout)
            host_elem = root.find('host')
            
            if host_elem is None:
                self.scan_status[target_ip] = {"status": "error", "results": "Host seems down."}
                log_event("ERROR", "Scanner", f"Scan failed on {target_ip}: Host seems down.")
                return
                
            ports = []
            ports_elem = host_elem.find('ports')
            if ports_elem is not None:
                for port_elem in ports_elem.findall('port'):
                    state_elem = port_elem.find('state')
                    service_elem = port_elem.find('service')
                    
                    port_num = int(port_elem.get('portid', 0))
                    proto = port_elem.get('protocol', 'unknown')
                    state = state_elem.get('state', 'unknown') if state_elem is not None else 'unknown'
                    
                    service_name = service_elem.get('name', 'unknown').lower() if service_elem is not None else 'unknown'
                    
                    # Determine Base Risk
                    risk_level = "Info"
                    if state == 'open':
                        risk_level = "Medium" # Default for open ports
                        if port_num in RISK_PROFILES:
                            risk_level = RISK_PROFILES[port_num]["level"]
                    
                    # Determine Remediation
                    remediation = "Update the service to the latest version and monitor vendor security advisories."
                    if service_name in REMEDIATION_DB:
                        remediation = REMEDIATION_DB[service_name]
                    
                    # Parse All Script Outputs
                    vulnerabilities = []
                    script_outputs = []
                    
                    for script_elem in port_elem.findall('.//script'):
                        script_id = script_elem.get('id', 'unknown')
                        output_text = script_elem.get('output', '')
                        
                        if script_id == 'vulners':
                            vulnerabilities = self.parse_vulners_output(output_text)
                        else:
                            # Ignore noisy/informational scripts to keep UI clean
                            NOISY_SCRIPTS = ['fingerprint-strings', 'ssl-cert', 'rpcinfo', 'banner']
                            if script_id not in NOISY_SCRIPTS and output_text and "ERROR" not in output_text.upper():
                                short_output = output_text.split('\n')[0][:150]
                                script_outputs.append(f"[{script_id}] {short_output}")

                    # Elevate risk level if high CVSS vulnerabilities are found
                    if vulnerabilities:
                        max_score = max(v['cvss_score'] for v in vulnerabilities)
                        if max_score >= 9.0: risk_level = "Critical"
                        elif max_score >= 7.0: risk_level = "High"
                        elif max_score >= 4.0: risk_level = "Medium"
                        
                        # NEW: Automatically generate alerts for found vulnerabilities
                        version_str = service_elem.get('version', '') if service_elem is not None else ''
                        for v in vulnerabilities:
                            sev = "Medium"
                            if v['cvss_score'] >= 9.0: sev = "Critical"
                            elif v['cvss_score'] >= 7.0: sev = "High"
                            
                            threat_engine.log_alert(
                                severity=sev,
                                alert_type=f"Vulnerability Found: {v['cve_id']}",
                                description=f"Target: {target_ip} ({service_name} v{version_str}). CVSS: {v['cvss_score']}. Exploit: {v['reference']}",
                                source_ip=target_ip
                            )
                            
                    ports.append({
                        "port": port_num,
                        "protocol": proto,
                        "state": state,
                        "service": service_name,
                        "version": service_elem.get('version', '') if service_elem is not None else '',
                        "risk_level": risk_level,
                        "vulnerabilities": vulnerabilities,
                        "scripts": script_outputs,
                        "remediation": remediation
                    })
            
            os_match = "Unknown"
            os_elem = host_elem.find('os')
            if os_elem is not None:
                osmatch_elem = os_elem.find('osmatch')
                if osmatch_elem is not None:
                    os_match = osmatch_elem.get('name', 'Unknown')
            
            scan_data = {
                "ip": target_ip,
                "os": os_match,
                "ports": ports,
                "profile": profile_name
            }
            
            self.scan_status[target_ip] = {"status": "complete", "results": scan_data}
            print(f"[*] Advanced scan complete for {target_ip}.")
            log_event("SUCCESS", "Scanner", f"Scan complete for {target_ip}. Found {len(ports)} ports.")
            
        except subprocess.TimeoutExpired:
            self.scan_status[target_ip] = {"status": "error", "results": "Scan timed out (10 min limit)."}
            log_event("ERROR", "Scanner", f"Scan timed out on {target_ip}.")
        except Exception as e:
            print(f"[!] Scan error: {e}")
            self.scan_status[target_ip] = {"status": "error", "results": str(e)}
            log_event("ERROR", "Scanner", f"Exception during scan on {target_ip}: {str(e)}")

scanner_service = ScannerService()