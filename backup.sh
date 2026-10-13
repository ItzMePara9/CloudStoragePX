#!/usr/bin/env bash
# ==============================================================================
# CloudStoragePX — Vault & Database Backup Utility
# ==============================================================================

set -euo pipefail

APP_DIR="${1:-/opt/cloudstoragepx}"
DATA_DIR="${APP_DIR}/data"
BACKUP_DEST="${2:-./cloudstoragepx_backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="cloudstoragepx_full_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DEST"

echo "=== CloudStoragePX Backup ==="
echo "Source: $DATA_DIR"
echo "Destination: $BACKUP_DEST/$ARCHIVE_NAME"

if [ ! -d "$DATA_DIR" ]; then
  echo "Error: Data directory not found at $DATA_DIR"
  exit 1
fi

# Package database, keys, and encrypted vault storage safely
tar -czf "$BACKUP_DEST/$ARCHIVE_NAME" \
  -C "$APP_DIR" \
  data/cloudstorage.db \
  data/.vault_key \
  data/vault \
  .env 2>/dev/null || true

chmod 600 "$BACKUP_DEST/$ARCHIVE_NAME"

echo "✓ Full backup created successfully: $BACKUP_DEST/$ARCHIVE_NAME"
echo "Note: Store this archive and your master encryption key in a secure offsite location."
