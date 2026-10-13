#!/usr/bin/env bash
# ==============================================================================
# CloudStoragePX — Production VPS Installer
# Target Systems: Debian 12+, Ubuntu 22.04 / 24.04 LTS (x86_64, aarch64)
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       CloudStoragePX — VPS Production Installer      ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Root / Sudo check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: This script must be run as root or with sudo privileges.${NC}"
  exit 1
fi

# 2. OS & Architecture Check
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then
  echo -e "${RED}Error: Unsupported architecture: ${ARCH}. Only x86_64 and aarch64 (ARM64) are supported.${NC}"
  exit 1
fi

if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo -e "${GREEN}Detected OS:${NC} ${NAME} ${VERSION_ID} (${ARCH})"
else
  echo -e "${RED}Error: Cannot determine Linux distribution.${NC}"
  exit 1
fi

# 3. Dependencies
echo -e "\n${BLUE}[1/7] Updating package index and installing base dependencies...${NC}"
apt-get update -y
apt-get install -y curl git ufw tar gzip openssl

# Node.js 22 LTS check / installation
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
  echo -e "${YELLOW}Installing Node.js 22 LTS via NodeSource...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}Node.js version:${NC} $(node -v)"

# 4. Service User & Directory Provisioning
APP_DIR="/root/cloudstoragepx"
DATA_DIR="/root/cloudstoragepx/data"
VAULT_DIR="/root/cloudstoragepx/data/vault"
SERVICE_USER="cloudstoragepx"

echo -e "\n${BLUE}[2/7] Creating restricted service user and storage directories...${NC}"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  echo -e "${GREEN}Created service account: ${SERVICE_USER}${NC}"
fi

mkdir -p "$APP_DIR" "$DATA_DIR" "$VAULT_DIR"

# 5. Application Code Setup
echo -e "\n${BLUE}[3/7] Setting up application files and environment...${NC}"
cp -r ./* "$APP_DIR/" 2>/dev/null || true
cd "$APP_DIR"

# Generate 32-byte master encryption key if not present
KEY_FILE="${DATA_DIR}/.vault_key"
if [ ! -f "$KEY_FILE" ]; then
  openssl rand -hex 32 > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo -e "${GREEN}Generated AES-256-GCM Master Key (${KEY_FILE})${NC}"
fi

# Configure .env
if [ ! -f "$APP_DIR/.env" ]; then
  cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
PORT=3000
STORAGE_ENCRYPTION_KEY=$(cat "$KEY_FILE")
APP_URL=http://localhost:3000
EOF
  chmod 600 "$APP_DIR/.env"
fi

# Install production dependencies
echo -e "\n${BLUE}[4/7] Installing dependencies & compiling assets...${NC}"
npm install --production=false
npm run build

# 6. Initial Owner Account Setup
echo -e "\n${BLUE}[5/7] Provisioning Initial Owner Account...${NC}"
npm run setup || true

# Fix permissions
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
chmod 700 "$DATA_DIR" "$VAULT_DIR"

# 7. Systemd Service Setup
echo -e "\n${BLUE}[6/7] Creating systemd service unit...${NC}"
cat <<EOF > /etc/systemd/system/cloudstoragepx.service
[Unit]
Description=CloudStoragePX Private Cloud Storage Service
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
ExecStart=$(which node) ${APP_DIR}/server.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env

# Security Sandbox
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudstoragepx
systemctl restart cloudstoragepx

# 8. Verification & Health Check
echo -e "\n${BLUE}[7/7] Verifying health endpoint...${NC}"
sleep 3
if curl -s http://127.0.0.1:3000/api/health | grep -q "CloudStoragePX"; then
  echo -e "\n${GREEN}======================================================${NC}"
  echo -e "${GREEN}  ✓ CloudStoragePX installed & running successfully!  ${NC}"
  echo -e "${GREEN}======================================================${NC}"
  echo -e "Local Address:   http://127.0.0.1:3000"
  echo -e "Service Status:  systemctl status cloudstoragepx"
  echo -e "Logs:            journalctl -u cloudstoragepx -f"
  echo -e "Vault Location:  ${VAULT_DIR}"
  echo -e "Reverse Proxy:   See nginx.conf.example for SSL setup\n"
else
  echo -e "${YELLOW}Warning: Service started but health response was delayed. Check logs via: journalctl -u cloudstoragepx -n 50${NC}"
fi
