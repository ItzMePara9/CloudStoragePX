#!/usr/bin/env bash
# ==============================================================================
# CloudStoragePX — Disaster Recovery & Backup Restoration
# ==============================================================================

set -euo pipefail

ARCHIVE_PATH="${1:-}"
TARGET_DIR="${2:-/root/cloudstoragepx}"

if [ -z "$ARCHIVE_PATH" ] || [ ! -f "$ARCHIVE_PATH" ]; then
  echo "Usage: ./restore.sh <path-to-backup.tar.gz> [target-app-directory]"
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "Error: Must be run as root or with sudo."
  exit 1
fi

echo "=== CloudStoragePX Disaster Recovery ==="
echo "Restoring from: $ARCHIVE_PATH"
echo "Target directory: $TARGET_DIR"

read -p "WARNING: This will overwrite existing database and vault files in $TARGET_DIR. Proceed? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Restoration cancelled."
  exit 0
fi

# Stop service if running
systemctl stop cloudstoragepx 2>/dev/null || true

# Extract archive
mkdir -p "$TARGET_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$TARGET_DIR"

# Restore file ownership & secure permissions
if id "cloudstoragepx" >/dev/null 2>&1; then
  chown -R cloudstoragepx:cloudstoragepx "$TARGET_DIR"
fi
chmod 700 "$TARGET_DIR/data" "$TARGET_DIR/data/vault" 2>/dev/null || true
chmod 600 "$TARGET_DIR/data/.vault_key" 2>/dev/null || true

# Restart service
systemctl start cloudstoragepx 2>/dev/null || true

echo "✓ Backup restored successfully. Verify service status via: systemctl status cloudstoragepx"
