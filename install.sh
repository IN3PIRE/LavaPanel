#!/bin/bash
set -euo pipefail

SCRIPT_VERSION="2.0.2"
LOG_FILE="/var/log/lavapanel-install.log"
INSTALL_DIR="/opt/LavaPanel"
SERVICE_NAME="lavapanel"
DEFAULT_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO] $*${NC}"; }
log_success() { echo -e "${GREEN}[SUCCESS] $*${NC}"; }
log_warning() { echo -e "${YELLOW}[WARNING] $*${NC}"; }
log_error() { echo -e "${RED}[ERROR] $*${NC}" >&2; }
log_progress() { echo -e "${BLUE}[...] $*${NC}"; }

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Installation failed with exit code: $exit_code"
        log_error "Check log file: $LOG_FILE"
    fi
}
trap cleanup EXIT

error_exit() { log_error "$1"; exit "${2:-1}"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        if ! command -v sudo &> /dev/null || ! sudo -v &> /dev/null; then
            error_exit "Root or sudo privileges required" 4
        fi
        SUDO_CMD="sudo"
    else
        SUDO_CMD=""
    fi
}

detect_os() {
    log_progress "Detecting operating system..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian|linuxmint|pop|elementary)
                log_success "Detected Debian-based system: $NAME $VERSION"
                return 0
                ;;
            *)
                if [[ "${ID_LIKE:-}" == *"debian"* ]]; then
                    log_success "Detected Debian-like system: $NAME $VERSION"
                    return 0
                fi
                ;;
        esac
    fi
    error_exit "Unsupported OS. Requires Debian/Ubuntu-based system." 1
}

install_nodejs() {
    log_progress "Installing Node.js 18.x..."
    
    if ! $SUDO_CMD apt-get install -y curl ca-certificates gnupg; then
        error_exit "Failed to install prerequisites" 1
    fi
    
    $SUDO_CMD mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | $SUDO_CMD gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | $SUDO_CMD tee /etc/apt/sources.list.d/nodesource.list
    
    $SUDO_CMD apt-get update
    $SUDO_CMD apt-get install -y nodejs
    
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node -v) and npm $(npm -v) installed"
    else
        error_exit "Node.js installation failed" 1
    fi
}

check_and_install_deps() {
    log_progress "Checking dependencies..."
    local missing=()
    
    for cmd in curl git; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if ! command -v node &> /dev/null; then
        missing+=("nodejs")
    elif [[ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]]; then
        missing+=("nodejs-upgrade")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_warning "Missing: ${missing[*]}"
        log_progress "Installing dependencies..."
        
        $SUDO_CMD apt-get update
        
        local to_install=()
        for dep in "${missing[@]}"; do
            if [[ "$dep" == "nodejs" || "$dep" == "nodejs-upgrade" ]]; then
                install_nodejs
            else
                to_install+=("$dep")
            fi
        done
        
        if [[ ${#to_install[@]} -gt 0 ]]; then
            $SUDO_CMD apt-get install -y "${to_install[@]}"
        fi
        
        log_success "Dependencies installed"
    else
        log_success "All dependencies satisfied"
    fi
}

clone_repo() {
    log_progress "Cloning LavaPanel..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        if [[ -d "$INSTALL_DIR/.git" ]]; then
            log_info "Updating existing installation..."
            cd "$INSTALL_DIR"
            git pull || log_warning "Update failed, continuing"
            cd - > /dev/null
        else
            error_exit "$INSTALL_DIR exists but is not a git repo" 2
        fi
    else
        $SUDO_CMD git clone --depth 1 https://github.com/IN3PIRE/LavaPanel.git "$INSTALL_DIR"
        log_success "Repository cloned"
    fi
}

install_deps() {
    log_progress "Installing npm dependencies..."
    cd "$INSTALL_DIR"
    
    if npm ci --legacy-peer-deps 2>/dev/null; then
        log_success "Dependencies installed (npm ci)"
    else
        log_warning "npm ci failed, trying npm install..."
        if npm install --legacy-peer-deps; then
            log_success "Dependencies installed (npm install)"
        else
            error_exit "Failed to install npm dependencies" 2
        fi
    fi
    
    cd - > /dev/null
}

setup_config() {
    log_progress "Configuring LavaPanel..."
    cd "$INSTALL_DIR"
    
    if [[ ! -f ".env" ]]; then
        cp .env.example .env 2>/dev/null || cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production
DATABASE_PATH=./data/lavapanel.db
JWT_SECRET=change-me
SESSION_SECRET=change-me
FRONTEND_URL=http://localhost:3000
ENVEOF
    else
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    local jwt=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2-)
    if [[ -z "$jwt" || "$jwt" == "change-me"* || "$jwt" == "your-"* ]]; then
        local newjwt=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$newjwt|" .env
    fi
    
    local sess=$(grep "^SESSION_SECRET=" .env | cut -d'=' -f2-)
    if [[ -z "$sess" || "$sess" == "change-me"* || "$sess" == "your-"* ]]; then
        local newsess=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
        sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$newsess|" .env
    fi
    
    sed -i "s|^PORT=.*|PORT=$DEFAULT_PORT|" .env
    
    local datadir=$(grep "^DATABASE_PATH=" .env | cut -d'=' -f2 | xargs dirname)
    [[ -n "$datadir" && "$datadir" != "." ]] && mkdir -p "$datadir"
    
    cd - > /dev/null
    log_success "Configuration complete"
}

setup_service() {
    log_progress "Setting up systemd service..."
    
    cat > /tmp/lavapanel.service << SVCEOF
[Unit]
Description=LavaPanel Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

    $SUDO_CMD cp /tmp/lavapanel.service /etc/systemd/system/lavapanel.service
    $SUDO_CMD systemctl daemon-reload
    $SUDO_CMD systemctl enable lavapanel
    $SUDO_CMD systemctl start lavapanel
    
    rm -f /tmp/lavapanel.service
    
    sleep 2
    if $SUDO_CMD systemctl is-active --quiet lavapanel; then
        log_success "Service started and running"
    else
        log_warning "Service may not be healthy. Check: systemctl status lavapanel"
    fi
}

show_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  LAVAPANEL INSTALLED SUCCESSFULLY${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Install Path: $INSTALL_DIR"
    echo "Port: $DEFAULT_PORT"
    echo ""
    echo "Access:"
    echo "  Local: http://localhost:$DEFAULT_PORT"
    if command -v hostname &> /dev/null; then
        echo "  Server: http://$(hostname -I | awk '{print $1}'):${DEFAULT_PORT}"
    fi
    echo ""
    echo "Commands:"
    echo "  Status:  sudo systemctl status lavapanel"
    echo "  Logs:    sudo journalctl -u lavapanel -f"
    echo "  Restart: sudo systemctl restart lavapanel"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:$DEFAULT_PORT"
    echo "  2. Complete setup wizard"
    echo ""
    echo -e "${GREEN}Enjoy!${NC}"
}

main() {
    echo ""
    echo -e "${BLUE}LavaPanel Installer v${SCRIPT_VERSION}${NC}"
    echo "================================"
    echo ""
    
    touch "$LOG_FILE" 2>/dev/null || true
    
    check_root
    detect_os
    check_and_install_deps
    clone_repo
    install_deps
    setup_config
    setup_service
    show_summary
    
    exit 0
}

main "$@"