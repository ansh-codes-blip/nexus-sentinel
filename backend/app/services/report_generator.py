"""
PDF Report Generation Service using ReportLab.
"""
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import inch
from app.database import SessionLocal
from app.models.device import Device
from app.models.alert import Alert
from app.models.log import SystemLog
from app.services.logger import log_event

REPORT_DIR = os.path.expanduser("~/.nexus_sentinel/reports")
os.makedirs(REPORT_DIR, exist_ok=True)

def generate_network_report():
    """Generates a comprehensive PDF report and returns the file path."""
    db = SessionLocal()
    try:
        timestamp_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"Nexus_Sentinel_Report_{timestamp_str}.pdf"
        filepath = os.path.join(REPORT_DIR, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []
        
        # Custom Styles
        title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], textColor=colors.HexColor('#3b82f6'), fontSize=24, spaceAfter=10)
        h2_style = ParagraphStyle('CustomH2', parent=styles['Heading2'], textColor=colors.HexColor('#e4e4e7'), fontSize=14, spaceBefore=20, spaceAfter=10)
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], textColor=colors.HexColor('#a1a1aa'), fontSize=10)
        
        # --- COVER PAGE ---
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph("Nexus Sentinel", title_style))
        story.append(Paragraph("Network Security & Intelligence Report", styles['h2']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
        story.append(PageBreak())
        
        # --- EXECUTIVE SUMMARY ---
        story.append(Paragraph("1. Executive Summary", h2_style))
        devices = db.query(Device).all()
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(50).all()
        
        critical_alerts = sum(1 for a in alerts if a.severity == 'Critical')
        high_alerts = sum(1 for a in alerts if a.severity == 'High')
        online_devices = sum(1 for d in devices if d.status == 'online')
        
        summary_text = f"""
        This report provides an overview of the network security posture as of {datetime.now().strftime('%Y-%m-%d')}.
        <br/><br/>
        <b>Network Assets:</b> {len(devices)} total devices discovered, {online_devices} currently online.
        <br/><br/>
        <b>Threat Posture:</b> {len(alerts)} security alerts recorded in the recent session.
        <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;• Critical Threats: {critical_alerts}<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;• High Severity Threats: {high_alerts}
        """
        story.append(Paragraph(summary_text, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # --- DEVICE INVENTORY ---
        story.append(Paragraph("2. Device Inventory", h2_style))
        device_data = [['IP Address', 'MAC Address', 'Hostname', 'Vendor', 'Status']]
        for d in devices:
            device_data.append([
                d.ip_address, 
                d.mac_address or 'N/A', 
                d.hostname or 'Unknown',
                (d.vendor or 'Unknown')[:20],
                d.status
            ])
            
        device_table = Table(device_data, colWidths=[1.2*inch, 1.5*inch, 1.5*inch, 1.5*inch, 0.8*inch])
        device_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27272a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#18181b')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#d4d4d8')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3f3f46')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(device_table)
        story.append(PageBreak())
        
        # --- THREAT FINDINGS ---
        story.append(Paragraph("3. Threat Findings", h2_style))
        if not alerts:
            story.append(Paragraph("No security threats detected during the monitoring period.", normal_style))
        else:
            alert_data = [['Timestamp', 'Severity', 'Alert Type', 'Source IP', 'Description']]
            for a in alerts:
                alert_data.append([
                    a.timestamp.strftime("%H:%M:%S"),
                    a.severity,
                    a.alert_type,
                    a.source_ip,
                    a.description[:50] + "..." if len(a.description) > 50 else a.description
                ])
                
            alert_table = Table(alert_data, colWidths=[0.8*inch, 0.8*inch, 1.5*inch, 1.0*inch, 2.9*inch])
            alert_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27272a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#18181b')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#d4d4d8')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3f3f46')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                # Highlight Critical/High rows
                *[('TEXTCOLOR', (1, i), (1, i), colors.red) for i in range(1, len(alert_data)) if alert_data[i][1] in ['Critical', 'High']]
            ]))
            story.append(alert_table)
            
        story.append(Spacer(1, 0.3*inch))
        
        # --- AI RECOMMENDATIONS ---
        story.append(Paragraph("4. AI Recommendations", h2_style))
        recommendations = "Based on the network analysis, ensure all devices are updated to their latest firmware. Disable unnecessary services like UPnP and Telnet. Monitor outbound DNS traffic for anomalies."
        story.append(Paragraph(recommendations, normal_style))
        
        doc.build(story)
        log_event("SUCCESS", "ReportGenerator", f"Report generated: {filename}")
        return filepath
        
    except Exception as e:
        print(f"Error generating report: {e}")
        log_event("ERROR", "ReportGenerator", str(e))
        return None
    finally:
        db.close()