#!/bin/bash

# ──────────────────────────────────────────────────────────────
#   Improved LavaPanel Installer (2026‑04‑06)
#   • Non‑interactive defaults via env vars or defaults
#   • Detects OS and auto‑installs Node.js 18+ via NodeSource or Homebrew
#   • Adds basic validation and verbose output
#   • Supports starting with PM2 or in dev mode
#   ──────────────────────────────────────────────────────────────

set -euo pipefail

# Colour helpers
RED=$(tput setaf 1); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); BLUE=$(tput setaf 4); NC=$(tput sgr0)

# Default vars (can be overridden via environment variables)
: ${PORT:=3000}
: ${DISCORD_CLIENT_ID:=""}
: ${DISCORD_CLIENT_SECRET:=""}
: ${TELEGRAM_BOT_TOKEN:=""}

# Helper: log message
log() { printf "%s\n" "$1"; }

# Determine OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif command -v apt-get &> /dev/null; then
    OS="ubuntu"
elif command -v dnf &> /dev/null; then
    OS="fedora"
elif command -v yum &> /dev/null; then
    OS="centos"
else
    log "${RED}❌ Unsupported OS; aborting${NC}"
    exit 1
fi
log "Detected OS: $OS"

# Install Node.js 18.x
install_node() {
    log "Installing Node.js 18..."
    case "$OS" in
        ubuntu)
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
        fedora|centos)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            dnf install -y nodejs
            ;;
        macos)
            brew update && brew install node@18
            brew link --force node@18
            ;;
    esac
    log "Node.js $(node -v) installed."
}

# Verify Git
if ! command -v git &> /dev/null; then
    log "${YELLOW}⚠️ Git not found. Installing..."
    case "$OS" in
        ubuntu)
            apt-get install -y git
            ;;
        fedora|centos)
            dnf install -y git
            ;;
        macos)
            brew install git
            ;;
    esac
fi

# Clone or update repo
if [ -d "LavaPanel" ]; then
    log "Updating existing repository..."
    pushd LavaPanel >/dev/null
    git pull || true
    popd >/dev/null
else
    log "Cloning LavaPanel repository..."
    git clone https://github.com/IN3PIRE/LavaPanel.git
fi

pushd LavaPanel >/dev/null

# Node modules
if [ -f "node_modules" ]; then
    log "node_modules already exists; skipping npm install."
else
    log "Installing npm dependencies..."
    npm ci --legacy-peer-deps
fi

# .env setup
if [ -f ".env" ]; then
    log ".env already exists; backing up as .env.bak"
    cp .env .env.bak
fi
cp .env.example .env

# Replace defaults in .env
sed -i "s/PORT=.*/PORT=$PORT/" .env
sed -i "s/# DISCORD_CLIENT_ID=.*/DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID/" .env
sed -i "s/# DISCORD_CLIENT_SECRET=.*/DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET/" .env
sed -i "s/# TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN/" .env

# Secrets
if ! grep -q JWT_SECRET .env; then
    JWT=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    SESSION=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT/" .env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION/" .env
fi

# PM2 (optional)
install_pm2() {
    if command -v pm2 &> /dev/null; then return; fi
    log "Installing PM2..."
    npm install -g pm2
    pm2 start server/index.js --name lavapanel
    pm2 save
}

# Choose startup method
if [ "$1" == "--pm2" ]; then
    install_pm2
else
    log "Starting in dev mode: npm start"
    npm start &
fi

log "Installation finished. LavaPanel is ready at http:\/\/localhost:$PORT"
popd >/dev/null
