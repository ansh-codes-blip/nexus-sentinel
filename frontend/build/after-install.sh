#!/bin/bash
# Grant the Nexus Sentinel backend raw packet capture permissions
# This allows the app to capture packets without running as root

# Find where the app was installed (usually /opt/Nexus Sentinel)
INSTALL_DIR="/opt/Nexus Sentinel"
BACKEND_EXE="$INSTALL_DIR/resources/backend/nexus-backend"

if [ -f "$BACKEND_EXE" ]; then
    echo "Setting packet capture permissions for Nexus Sentinel..."
    chmod +x "$BACKEND_EXE"
    setcap cap_net_raw,cap_net_admin=eip "$BACKEND_EXE"
else
    echo "Backend binary not found, skipping permissions."
fi