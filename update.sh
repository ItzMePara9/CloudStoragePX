#!/usr/bin/env bash
# ==============================================================================
# CloudStoragePX — Safe Production Update Script
# ==============================================================================

set -euo pipefail

APP_DIR="/root/cloudstoragepx"
BACKUP_DIR="/root/cloudstoragepx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ "$EUID" -ne 0 ]; then
  echo "Error: Must be run as root or with sudo."
  exit 1
fi

echo "=== CloudStoragePX Safe Update ==="

# 1. Automated safety backup of database and encryption key
mkdir -p "$BACKUP_DIR"
echo "[1/4] Creating pre-update safety backup..."
if [ -f "$APP_DIR/data/cloudstorage.db" ]; then
  cp "$APP_DIR/data/cloudstorage.db" "$BACKUP_DIR/cloudstorage_preupdate_${TIMESTAMP}.db"
fi
if [ -f "$APP_DIR/data/.vault_key" ]; then
  cp "$APP_DIR/data/.vault_key" "$BACKUP_DIR/vault_key_preupdate_${TIMESTAMP}.bak"
fi
echo "Backup created at: $BACKUP_DIR"

# 2. Update files / dependencies
cd "$APP_DIR"
echo "[2/4] Updating dependencies and building frontend..."
npm install --production=false
npm run build

# 3. Fix permissions
chown -R cloudstoragepx:cloudstoragepx "$APP_DIR"

# 4. Restart service & verify
echo "[3/4] Restarting service..."
systemctl restart cloudstoragepx

echo "[4/4] Verifying health..."
sleep 3
if curl -s http://127.0.0.1:3000/api/health | grep -q "CloudStoragePX"; then
  echo "✓ Update completed successfully and system is healthy."
else
  echo "⚠️ Warning: Health check failed. You can restore pre-update database from: $BACKUP_DIR/cloudstorage_preupdate_${TIMESTAMP}.db"
fi
