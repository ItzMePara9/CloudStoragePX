#!/usr/bin/env bash
# ==============================================================================
# CloudStoragePX — Service Uninstaller
# ==============================================================================

set -euo pipefail

APP_DIR="/root/cloudstoragepx"

if [ "$EUID" -ne 0 ]; then
  echo "Error: Must be run as root or with sudo."
  exit 1
fi

echo "======================================================"
echo "          CloudStoragePX Uninstallation Wizard        "
echo "======================================================"
echo "This will stop the cloudstoragepx service and remove service units."

read -p "Are you sure you want to proceed with uninstallation? (yes/NO): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Uninstallation cancelled."
  exit 0
fi

# Stop and disable systemd service
if systemctl is-active --quiet cloudstoragepx; then
  echo "Stopping service..."
  systemctl stop cloudstoragepx
fi

if [ -f /etc/systemd/system/cloudstoragepx.service ]; then
  echo "Removing systemd service unit..."
  systemctl disable cloudstoragepx
  rm -f /etc/systemd/system/cloudstoragepx.service
  systemctl daemon-reload
fi

# Ask about vault data
read -p "Do you want to permanently delete all uploaded vault files and the database? (type 'DELETE' to confirm, or enter to keep data): " wipe_data
if [ "$wipe_data" == "DELETE" ]; then
  echo "Wiping application files, database, and encrypted vault..."
  rm -rf "$APP_DIR"
  echo "Data completely removed."
else
  echo "Application directory and user files preserved at: $APP_DIR"
fi

echo "✓ CloudStoragePX has been uninstalled."
