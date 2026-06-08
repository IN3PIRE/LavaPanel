#!/bin/bash
set -euo pipefail

echo "================================"
echo "  LavaPanel Installer v2.0.5"
echo "================================"
echo ""

INSTALL_DIR="/opt/LavaPanel"
PORT=3000

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() { echo -e "${BLUE}[...] $1${NC}"; }
log_ok() { echo -e "${GREEN}[OK] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
log_err() { echo -e "${RED}[ERROR] $1${NC}" >&2; }

# Check root
if [[ $EUID -ne 0 ]]; then
    if ! sudo -v 2>/dev/null; then
        log_err "Root or sudo required"
        exit 1
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Detect OS
log_step "Checking OS..."
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
        ubuntu|debian|linuxmint|pop|elementary)
            log_ok "Detected $NAME $VERSION"
            ;;
        *)
            if [[ "${ID_LIKE:-}" == *"debian"* ]]; then
                log_ok "Detected $NAME $VERSION (Debian-like)"
            else
                log_err "Unsupported OS: $ID. Need Debian/Ubuntu."
                exit 1
            fi
            ;;
    esac
fi

# CRITICAL: Update apt FIRST before any package checks
log_step "Updating package lists..."
$SUDO apt-get update

# FORCE install Node.js and npm - don't check, just install
log_step "Installing Node.js and npm..."
$SUDO apt-get install -y nodejs npm curl git openssl

# Verify versions
if command -v node &>/dev/null && command -v npm &>/dev/null; then
    log_ok "Node.js $(node -v) installed"
    log_ok "npm $(npm -v) installed"
else
    log_err "Failed to install Node.js or npm"
    exit 1
fi

# Clone repo
log_step "Cloning LavaPanel..."
if [[ -d "$INSTALL_DIR" ]]; then
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        cd "$INSTALL_DIR"
        git pull || true
        cd - >/dev/null
        log_ok "Repository updated"
    else
        log_err "$INSTALL_DIR exists but not a git repo"
        exit 1
    fi
else
    $SUDO git clone --depth 1 https://github.com/IN3PIRE/LavaPanel.git "$INSTALL_DIR"
    log_ok "Repository cloned"
fi

# Install npm deps
log_step "Installing npm dependencies (this may take a minute)..."
cd "$INSTALL_DIR"
if npm ci --legacy-peer-deps 2>/dev/null; then
    log_ok "Dependencies installed (npm ci)"
else
    log_step "npm ci failed, trying npm install..."
    if npm install --legacy-peer-deps; then
        log_ok "Dependencies installed (npm install)"
    else
        log_err "Failed to install dependencies"
        exit 1
    fi
fi

# Setup .env
log_step "Configuring..."
if [[ ! -f ".env" ]]; then
    cp .env.example .env 2>/dev/null || echo "PORT=3000" > .env
fi

# Generate secrets
JWT=$(grep "^JWT_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
if [[ -z "$JWT" || "$JWT" == *"change"* || "$JWT" == *"your-"* ]]; then
    NEWJWT=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    if grep -q "^JWT_SECRET=" .env 2>/dev/null; then
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEWJWT|" .env
    else
        echo "JWT_SECRET=$NEWJWT" >> .env
    fi
fi

SESS=$(grep "^SESSION_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
if [[ -z "$SESS" || "$SESS" == *"change"* || "$SESS" == *"your-"* ]]; then
    NEWSESS=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    if grep -q "^SESSION_SECRET=" .env 2>/dev/null; then
        sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$NEWSESS|" .env
    else
        echo "SESSION_SECRET=$NEWSESS" >> .env
    fi
fi

# Set port
if grep -q "^PORT=" .env 2>/dev/null; then
    sed -i "s|^PORT=.*|PORT=$PORT|" .env
else
    echo "PORT=$PORT" >> .env
fi

# Create data dir
DATADIR=$(grep "^DATABASE_PATH=" .env 2>/dev/null | cut -d'=' -f2 | xargs dirname 2>/dev/null || echo "")
if [[ -n "$DATADIR" && "$DATADIR" != "." ]]; then
    mkdir -p "$DATADIR"
fi

log_ok "Configuration complete"

# Setup systemd
log_step "Setting up systemd service..."
cat > /tmp/lavapanel.service << 'EOF'
[Unit]
Description=LavaPanel Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/LavaPanel
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

$SUDO cp /tmp/lavapanel.service /etc/systemd/system/lavapanel.service
$SUDO systemctl daemon-reload
$SUDO systemctl enable lavapanel
$SUDO systemctl start lavapanel
rm -f /tmp/lavapanel.service

sleep 2
if $SUDO systemctl is-active --quiet lavapanel; then
    log_ok "Service running"
else
    log_warn "Service starting (check: systemctl status lavapanel)"
fi

# Summary
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  LAVAPANEL INSTALLED SUCCESSFULLY${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Location: $INSTALL_DIR"
echo "Port: $PORT"
echo ""
echo "Access:"
echo "  Local:   http://localhost:$PORT"
if command -v hostname &>/dev/null; then
    echo "  Server:  http://$(hostname -I | awk '{print $1}'):${PORT}"
fi
echo ""
echo "Commands:"
echo "  Status:  systemctl status lavapanel"
echo "  Logs:    journalctl -u lavapanel -f"
echo "  Restart: systemctl restart lavapanel"
echo ""
echo "Next: Open http://localhost:$PORT in your browser"
echo ""
echo -e "${GREEN}Enjoy!${NC}"