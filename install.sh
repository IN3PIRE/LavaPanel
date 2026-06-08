#!/bin/bash
#===============================================================================
#   LavaPanel Production Installation Script
#   Automated deployment script for LavaPanel server management panel
#   
#   Target: Debian/Ubuntu-based Linux (x86_64)
#   Requirements: root or sudo access
#   GitHub: https://github.com/IN3PIRE/LavaPanel
#   Version: 2.0.1 (Fixed Unicode compatibility)
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
#   Configuration & Constants
#-------------------------------------------------------------------------------
readonly SCRIPT_VERSION="2.0.1"
readonly SCRIPT_NAME="lavapanel-installer"
readonly LOG_FILE="/var/log/lavapanel-install.log"
readonly INSTALL_DIR="/opt/LavaPanel"
readonly SERVICE_NAME="lavapanel"
readonly REQUIRED_NODE_VERSION="18"
readonly DEFAULT_PORT=3000

#-------------------------------------------------------------------------------
#   Color Codes for Output
#-------------------------------------------------------------------------------
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

#-------------------------------------------------------------------------------
#   Global Variables
#-------------------------------------------------------------------------------
VERBOSE=false
CUSTOM_INSTALL_DIR=""
SKIP_SERVICE=false
FIREWALL_PORT=""
JWT_SECRET=""
SESSION_SECRET=""
WARNINGS=()

#-------------------------------------------------------------------------------
#   Logging Functions
#-------------------------------------------------------------------------------
log_info() {
    local msg="[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $*"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_success() {
    local msg="[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $*"
    echo -e "${GREEN}${BOLD}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_warning() {
    local msg="[WARNING] $(date '+%Y-%m-%d %H:%M:%S') - $*"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
    WARNINGS+=("$msg")
}

log_error() {
    local msg="[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $*"
    echo -e "${RED}${BOLD}${msg}${NC}" >&2
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        local msg="[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') - $*"
        echo -e "${CYAN}${msg}${NC}"
        echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

log_progress() {
    local msg="[PROGRESS] $*"
    echo -e "${CYAN}[...] ${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

#-------------------------------------------------------------------------------
#   Cleanup & Error Handling
#-------------------------------------------------------------------------------
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Installation failed with exit code: $exit_code"
        log_error "Check log file: $LOG_FILE"
        echo ""
        echo -e "${RED}=================================================================${NC}"
        echo -e "${RED}  INSTALLATION FAILED${NC}"
        echo -e "${RED}=================================================================${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Review the log file: tail -n 50 $LOG_FILE"
        echo "  2. Check if dependencies are installed: dpkg -l | grep -E 'curl|git|nodejs'"
        echo "  3. Ensure you have root/sudo privileges"
        echo "  4. Run with --verbose for detailed output"
        echo ""
    fi
    
    # Clean up temporary files
    if [[ -n "${TMPDIR:-}" && -d "$TMPDIR" ]]; then
        rm -rf "$TMPDIR"
        log_verbose "Cleaned up temporary directory: $TMPDIR"
    fi
}

trap cleanup EXIT

error_exit() {
    local message="$1"
    local code="${2:-1}"
    log_error "$message"
    exit "$code"
}

#-------------------------------------------------------------------------------
#   Help & Usage
#-------------------------------------------------------------------------------
show_help() {
    cat << EOF
${BOLD}LavaPanel Production Installer v${SCRIPT_VERSION}${NC}

${BOLD}USAGE:${NC}
    $(basename "$0") [OPTIONS]

${BOLD}OPTIONS:${NC}
    -h, --help              Show this help message
    -v, --verbose           Enable verbose/debug output
    -d, --dir PATH          Custom installation directory (default: $INSTALL_DIR)
    -p, --port PORT         Custom port for LavaPanel (default: $DEFAULT_PORT)
    -n, --no-service        Skip systemd service setup
    -f, --firewall          Automatically open firewall port (if UFW detected)
    --skip-deps             Skip dependency installation (use with caution)

${BOLD}ENVIRONMENT VARIABLES:${NC}
    PORT                    Server port (default: 3000)
    DISCORD_CLIENT_ID       Discord OAuth client ID
    DISCORD_CLIENT_SECRET   Discord OAuth client secret
    TELEGRAM_BOT_TOKEN      Telegram bot token
    INSTALL_DIR             Custom installation directory

${BOLD}EXAMPLES:${NC}
    # Basic installation
    sudo $(basename "$0")

    # Custom port and verbose output
    sudo $(basename "$0") --port 8080 --verbose

    # Custom directory with Discord integration
    sudo $(basename "$0") --dir /var/www/lavapanel \\
         DISCORD_CLIENT_ID=your_id DISCORD_CLIENT_SECRET=your_secret

${BOLD}EXIT CODES:${NC}
    0   Success
    1   Dependency installation failure
    2   Repository clone failure
    3   Service setup failure
    4   Permission denied

${BOLD}LOG FILE:${NC}
    $LOG_FILE

EOF
}

#-------------------------------------------------------------------------------
#   Parameter Parsing
#-------------------------------------------------------------------------------
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -d|--dir)
                CUSTOM_INSTALL_DIR="$2"
                shift 2
                ;;
            -p|--port)
                DEFAULT_PORT="$2"
                shift 2
                ;;
            -n|--no-service)
                SKIP_SERVICE=true
                shift
                ;;
            -f|--firewall)
                FIREWALL_PORT="${DEFAULT_PORT}"
                shift
                ;;
            --skip-deps)
                SKIP_DEPENDENCIES=true
                shift
                ;;
            *)
                if [[ "$1" =~ ^[A-Z_]+=.* ]]; then
                    export "$1"
                else
                    log_error "Unknown option: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [[ -n "$CUSTOM_INSTALL_DIR" ]]; then
        INSTALL_DIR="$CUSTOM_INSTALL_DIR"
    fi
}

#-------------------------------------------------------------------------------
#   OS Detection & Validation
#-------------------------------------------------------------------------------
detect_os() {
    log_progress "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_NAME="$ID"
        OS_VERSION="$VERSION_ID"
        OS_LIKE="${ID_LIKE:-}"
    else
        error_exit "Cannot detect OS: /etc/os-release not found" 1
    fi
    
    log_verbose "OS detected: $OS_NAME $OS_VERSION"
    
    case "$OS_NAME" in
        ubuntu|debian|linuxmint|pop|elementary|neon|zorin|kali|parrot)
            OS_FAMILY="debian"
            log_success "Detected Debian-based system: ${BOLD}$NAME $VERSION${NC}"
            ;;
        *)
            if [[ "$OS_LIKE" == *"debian"* ]]; then
                OS_FAMILY="debian"
                log_success "Detected Debian-like system: ${BOLD}$NAME $VERSION${NC}"
            else
                log_error "Unsupported operating system: $OS_NAME"
                echo ""
                echo "This installer supports Debian/Ubuntu-based distributions only."
                echo "Your system: $NAME $VERSION ($OS_NAME)"
                echo ""
                echo "Supported distributions:"
                echo "  - Ubuntu 20.04+ (Focal Fossa and newer)"
                echo "  - Debian 10+ (Buster and newer)"
                echo "  - Linux Mint 20+"
                echo "  - Pop!_OS 20.04+"
                echo "  - Other Debian derivatives"
                echo ""
                error_exit "OS not supported. Please use a Debian/Ubuntu-based system." 1
            fi
            ;;
    esac
    
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "amd64" ]]; then
        log_warning "Non-standard architecture detected: $ARCH"
        log_info "Proceeding with installation, but compatibility not guaranteed"
    fi
}

#-------------------------------------------------------------------------------
#   Root/Sudo Check
#-------------------------------------------------------------------------------
check_root() {
    log_progress "Checking user privileges..."
    
    if [[ $EUID -eq 0 ]]; then
        log_verbose "Running as root"
        SUDO_CMD=""
    else
        if ! command -v sudo &> /dev/null; then
            error_exit "Neither root nor sudo available. Please run as root or install sudo." 4
        fi
        
        if ! sudo -v &> /dev/null; then
            error_exit "Sudo privileges required but not available. Please run with sudo." 4
        fi
        
        log_verbose "Running with sudo privileges"
        SUDO_CMD="sudo"
    fi
}

#-------------------------------------------------------------------------------
#   Dependency Checking
#-------------------------------------------------------------------------------
check_command() {
    local cmd="$1"
    command -v "$cmd" &> /dev/null
}

check_dependencies() {
    log_progress "Checking required dependencies..."
    
    local missing_deps=()
    local deps_to_check=("curl" "git" "systemctl")
    
    for dep in "${deps_to_check[@]}"; do
        if ! check_command "$dep"; then
            missing_deps+=("$dep")
            log_verbose "Missing: $dep"
        else
            log_verbose "Found: $dep"
        fi
    done
    
    local node_installed=false
    local npm_installed=false
    
    if check_command "node"; then
        local node_version
        node_version=$(node -v 2>/dev/null || echo "unknown")
        log_verbose "Found: Node.js $node_version"
        
        if [[ "$node_version" != "unknown" ]]; then
            local major_version
            major_version=$(echo "$node_version" | cut -d'.' -f1 | tr -d 'v')
            if [[ "$major_version" -ge 18 ]]; then
                log_verbose "Node.js version OK: $major_version >= 18"
                npm_installed=true
            else
                log_warning "Node.js version too old: $node_version (need v18+)"
                missing_deps+=("nodejs>=18")
            fi
        fi
    else
        missing_deps+=("nodejs")
        log_verbose "Missing: nodejs"
    fi
    
    if check_command "npm"; then
        local npm_version
        npm_version=$(npm -v 2>/dev/null || echo "unknown")
        log_verbose "Found: npm $npm_version"
        npm_installed=true
    else
        if ! $npm_installed; then
            missing_deps+=("npm")
        fi
        log_verbose "Missing: npm"
    fi
    
    DEPS_MISSING=(${missing_deps[@]})
    
    if [[ ${#missing_deps[@]} -eq 0 ]]; then
        log_success "All dependencies satisfied"
        return 0
    else
        log_warning "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
}

#-------------------------------------------------------------------------------
#   Dependency Installation
#-------------------------------------------------------------------------------
install_dependencies() {
    if [[ "${SKIP_DEPENDENCIES:-false}" == true ]]; then
        log_warning "Skipping dependency installation as requested"
        return 0
    fi
    
    if [[ ${#DEPS_MISSING[@]} -eq 0 ]]; then
        log_info "No dependencies to install"
        return 0
    fi
    
    log_progress "Installing missing dependencies..."
    
    log_info "Updating package lists..."
    if ! $SUDO_CMD apt-get update -qq; then
        error_exit "Failed to update package lists" 1
    fi
    
    local basic_deps=()
    local node_dep_needed=false
    
    for dep in "${DEPS_MISSING[@]}"; do
        case "$dep" in
            curl|git)
                basic_deps+=("$dep")
                ;;
            nodejs|nodejs>=18)
                node_dep_needed=true
                ;;
            npm)
                node_dep_needed=true
                ;;
        esac
    done
    
    if [[ ${#basic_deps[@]} -gt 0 ]]; then
        log_info "Installing: ${basic_deps[*]}"
        if ! $SUDO_CMD apt-get install -y -qq "${basic_deps[@]}"; then
            error_exit "Failed to install basic dependencies" 1
        fi
        log_success "Installed: ${basic_deps[*]}"
    fi
    
    if [[ "$node_dep_needed" == true ]]; then
        install_nodejs
    fi
    
    log_progress "Verifying dependencies..."
    if check_dependencies; then
        log_success "All dependencies installed successfully"
        return 0
    else
        error_exit "Dependency installation failed verification" 1
    fi
}

install_nodejs() {
    log_info "Installing Node.js ${REQUIRED_NODE_VERSION}.x via NodeSource..."
    
    if [[ -f /etc/apt/sources.list.d/nodesource.list ]]; then
        log_verbose "NodeSource repository already configured"
    else
        log_progress "Adding NodeSource repository..."
        
        local nodesource_script
        nodesource_script=$(mktemp)
        
        if ! curl -fsSL -o "$nodesource_script" "https://deb.nodesource.com/setup_${REQUIRED_NODE_VERSION}.x"; then
            rm -f "$nodesource_script"
            log_warning "NodeSource script download failed, trying alternative method..."
            
            log_info "Installing nodejs from Ubuntu repositories..."
            if ! $SUDO_CMD apt-get install -y -qq nodejs npm; then
                error_exit "Failed to install Node.js from repositories" 1
            fi
            return 0
        fi
        
        if ! $SUDO_CMD bash "$nodesource_script"; then
            rm -f "$nodesource_script"
            error_exit "NodeSource setup script failed" 1
        fi
        
        rm -f "$nodesource_script"
    fi
    
    log_progress "Installing nodejs package..."
    if ! $SUDO_CMD apt-get install -y -qq nodejs; then
        error_exit "Failed to install nodejs package" 1
    fi
    
    local node_version
    node_version=$(node -v 2>/dev/null || echo "unknown")
    
    if [[ "$node_version" == "unknown" ]]; then
        error_exit "Node.js installation failed - node command not found" 1
    fi
    
    local major_version
    major_version=$(echo "$node_version" | cut -d'.' -f1 | tr -d 'v')
    
    if [[ "$major_version" -ge 18 ]]; then
        log_success "Node.js ${node_version} installed successfully"
    else
        log_warning "Installed Node.js version ($node_version) may be older than recommended (v18+)"
    fi
    
    if check_command "npm"; then
        local npm_version
        npm_version=$(npm -v 2>/dev/null || echo "unknown")
        log_success "npm ${npm_version} installed successfully"
    else
        log_warning "npm not found after Node.js installation"
    fi
}

#-------------------------------------------------------------------------------
#   Repository Cloning
#-------------------------------------------------------------------------------
clone_repository() {
    log_progress "Cloning LavaPanel repository..."
    
    local parent_dir
    parent_dir=$(dirname "$INSTALL_DIR")
    
    if [[ ! -d "$parent_dir" ]]; then
        log_verbose "Creating parent directory: $parent_dir"
        $SUDO_CMD mkdir -p "$parent_dir" || error_exit "Failed to create parent directory" 2
    fi
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_verbose "Installation directory exists: $INSTALL_DIR"
        
        if [[ -d "$INSTALL_DIR/.git" ]]; then
            log_info "Updating existing LavaPanel installation..."
            cd "$INSTALL_DIR"
            
            if ! git fetch origin 2>/dev/null; then
                log_warning "Failed to fetch updates, continuing with existing code"
            else
                if ! git pull --rebase origin HEAD 2>/dev/null; then
                    log_warning "Failed to pull updates, continuing with existing code"
                else
                    log_success "Repository updated successfully"
                fi
            fi
            
            cd - > /dev/null
        else
            log_error "Directory $INSTALL_DIR exists but is not a git repository"
            error_exit "Please remove the directory or choose a different path" 2
        fi
    else
        log_info "Cloning to $INSTALL_DIR..."
        
        if ! $SUDO_CMD git clone --depth 1 https://github.com/IN3PIRE/LavaPanel.git "$INSTALL_DIR"; then
            error_exit "Failed to clone repository" 2
        fi
        
        log_success "Repository cloned successfully"
    fi
    
    $SUDO_CMD chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$INSTALL_DIR" 2>/dev/null || true
}

#-------------------------------------------------------------------------------
#   NPM Dependencies Installation
#-------------------------------------------------------------------------------
install_npm_dependencies() {
    log_progress "Installing Node.js dependencies..."
    
    cd "$INSTALL_DIR"
    
    if [[ -d "node_modules" ]]; then
        log_verbose "node_modules found, will reinstall to ensure consistency"
    fi
    
    if [[ ! -f "package.json" ]]; then
        error_exit "package.json not found - repository may be corrupted" 2
    fi
    
    log_info "Running npm ci (production install)..."
    if npm ci --legacy-peer-deps --loglevel=error; then
        log_success "Node.js dependencies installed successfully"
    else
        log_warning "npm ci failed, falling back to npm install..."
        if npm install --legacy-peer-deps --loglevel=error; then
            log_success "Node.js dependencies installed (fallback)"
        else
            error_exit "Failed to install Node.js dependencies" 2
        fi
    fi
    
    cd - > /dev/null
}

#-------------------------------------------------------------------------------
#   Configuration Setup
#-------------------------------------------------------------------------------
generate_random_secret() {
    openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-'
}

setup_configuration() {
    log_progress "Configuring LavaPanel..."
    
    cd "$INSTALL_DIR"
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            log_verbose "Creating .env from .env.example"
            cp .env.example .env
        else
            log_warning ".env.example not found, creating minimal .env"
            cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
DATABASE_PATH=./data/lavapanel.db
JWT_SECRET=change-me-in-production
SESSION_SECRET=change-me-in-production
FRONTEND_URL=http://localhost:3000
GITHUB_REPO=IN3PIRE/LavaPanel
AUTO_UPDATE_INTERVAL=3600000
EOF
        fi
    else
        log_verbose ".env already exists, backing up"
        cp .env .env.backup."$(date +%Y%m%d_%H%M%S)"
    fi
    
    local current_jwt
    current_jwt=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2-)
    local current_session
    current_session=$(grep "^SESSION_SECRET=" .env | cut -d'=' -f2-)
    
    if [[ -z "$current_jwt" || "$current_jwt" == "your-super-secret-jwt-key-change-this-in-production" || "$current_jwt" == "change-me-in-production" ]]; then
        JWT_SECRET=$(generate_random_secret)
        log_verbose "Generated new JWT_SECRET"
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    fi
    
    if [[ -z "$current_session" || "$current_session" == "your-session-secret-change-this-in-production" || "$current_session" == "change-me-in-production" ]]; then
        SESSION_SECRET=$(generate_random_secret)
        log_verbose "Generated new SESSION_SECRET"
        sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
    fi
    
    if [[ -n "${PORT:-}" ]]; then
        sed -i "s|^PORT=.*|PORT=$PORT|" .env
        log_verbose "Set PORT=$PORT"
    else
        PORT=$DEFAULT_PORT
        sed -i "s|^PORT=.*|PORT=$DEFAULT_PORT|" .env
        log_verbose "Set PORT=$DEFAULT_PORT (default)"
    fi
    
    if [[ -n "${DISCORD_CLIENT_ID:-}" ]]; then
        sed -i "s|^DISCORD_CLIENT_ID=.*|DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID|" .env
        log_verbose "Configured Discord client ID"
    fi
    
    if [[ -n "${DISCORD_CLIENT_SECRET:-}" ]]; then
        sed -i "s|^DISCORD_CLIENT_SECRET=.*|DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET|" .env
        log_verbose "Configured Discord client secret (hidden)"
    fi
    
    if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
        sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN|" .env
        log_verbose "Configured Telegram bot token (hidden)"
    fi
    
    local data_dir
    data_dir=$(grep "^DATABASE_PATH=" .env | cut -d'=' -f2 | xargs dirname)
    if [[ -n "$data_dir" && "$data_dir" != "." ]]; then
        mkdir -p "$data_dir"
        log_verbose "Created data directory: $data_dir"
    fi
    
    cd - > /dev/null
    
    log_success "Configuration completed"
}

#-------------------------------------------------------------------------------
#   Systemd Service Setup
#-------------------------------------------------------------------------------
setup_systemd_service() {
    if [[ "$SKIP_SERVICE" == true ]]; then
        log_info "Skipping systemd service setup as requested"
        return 0
    fi
    
    log_progress "Setting up systemd service..."
    
    cat > "/tmp/${SERVICE_NAME}.service" << EOF
[Unit]
Description=LavaPanel Server Management Panel
Documentation=https://github.com/IN3PIRE/LavaPanel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    if ! $SUDO_CMD cp "/tmp/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"; then
        rm -f "/tmp/${SERVICE_NAME}.service"
        error_exit "Failed to install systemd service file" 3
    fi
    
    rm -f "/tmp/${SERVICE_NAME}.service"
    
    log_verbose "Reloading systemd daemon..."
    if ! $SUDO_CMD systemctl daemon-reload; then
        error_exit "Failed to reload systemd daemon" 3
    fi
    
    log_verbose "Enabling ${SERVICE_NAME} service..."
    if ! $SUDO_CMD systemctl enable "${SERVICE_NAME}.service" 2>/dev/null; then
        log_warning "Failed to enable service (may already be enabled)"
    fi
    
    log_verbose "Starting ${SERVICE_NAME} service..."
    if ! $SUDO_CMD systemctl start "${SERVICE_NAME}.service"; then
        error_exit "Failed to start ${SERVICE_NAME} service" 3
    fi
    
    sleep 2
    
    if $SUDO_CMD systemctl is-active --quiet "${SERVICE_NAME}.service"; then
        log_success "Systemd service ${SERVICE_NAME} started successfully"
        return 0
    else
        log_warning "Service started but may not be healthy. Check: systemctl status ${SERVICE_NAME}"
        return 0
    fi
}

#-------------------------------------------------------------------------------
#   Firewall Configuration
#-------------------------------------------------------------------------------
configure_firewall() {
    if [[ -z "${FIREWALL_PORT:-}" ]]; then
        log_verbose "Firewall configuration not requested"
        return 0
    fi
    
    log_progress "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        if ufw status &> /dev/null; then
            log_info "Opening port $FIREWALL_PORT in UFW..."
            if $SUDO_CMD ufw allow "$FIREWALL_PORT/tcp" comment "LavaPanel"; then
                log_success "Firewall port $FIREWALL_PORT opened"
            else
                log_warning "Failed to open firewall port"
            fi
        else
            log_verbose "UFW installed but not active"
        fi
    else
        log_verbose "UFW not installed, skipping firewall configuration"
    fi
}

#-------------------------------------------------------------------------------
#   Verification & Testing
#-------------------------------------------------------------------------------
verify_installation() {
    log_progress "Verifying installation..."
    
    local verification_passed=true
    
    if [[ ! -d "$INSTALL_DIR" ]]; then
        log_error "Installation directory not found: $INSTALL_DIR"
        verification_passed=false
    fi
    
    local critical_files=("package.json" "server/index.js" ".env")
    for file in "${critical_files[@]}"; do
        if [[ ! -f "$INSTALL_DIR/$file" ]]; then
            log_error "Critical file missing: $file"
            verification_passed=false
        fi
    done
    
    if [[ "$SKIP_SERVICE" != true ]]; then
        if command -v systemctl &> /dev/null; then
            if $SUDO_CMD systemctl is-active --quiet "${SERVICE_NAME}.service" 2>/dev/null; then
                log_verbose "Service is running"
            else
                log_warning "Service is not running"
                verification_passed=false
            fi
        fi
    fi
    
    if [[ "$SKIP_SERVICE" != true && "$verification_passed" == true ]]; then
        sleep 3
        
        log_verbose "Testing connectivity on port $PORT..."
        if command -v curl &> /dev/null; then
            if curl -s --connect-timeout 5 "http://localhost:$PORT" > /dev/null 2>&1; then
                log_verbose "HTTP connectivity test passed"
            else
                log_warning "HTTP connectivity test failed (service may still be starting)"
            fi
        fi
    fi
    
    if [[ "$verification_passed" == true ]]; then
        log_success "Installation verification passed"
        return 0
    else
        log_warning "Some verification checks failed"
        return 1
    fi
}

#-------------------------------------------------------------------------------
#   Display Summary
#-------------------------------------------------------------------------------
display_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}=================================================================${NC}"
    echo -e "${GREEN}  LAVAPANEL INSTALLATION COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}=================================================================${NC}"
    echo ""
    echo -e "${BOLD}Installation Details:${NC}"
    echo "  - Version: ${SCRIPT_VERSION}"
    echo "  - Install Path: ${INSTALL_DIR}"
    echo "  - Port: ${PORT}"
    echo "  - Service: ${SERVICE_NAME}"
    echo ""
    
    if [[ "$SKIP_SERVICE" != true ]]; then
        echo -e "${BOLD}Service Status:${NC}"
        if command -v systemctl &> /dev/null; then
            if $SUDO_CMD systemctl is-active --quiet "${SERVICE_NAME}.service" 2>/dev/null; then
                echo "  - Status: ${GREEN}Running${NC}"
            else
                echo "  - Status: ${YELLOW}Not running${NC}"
                echo "  - Start with: sudo systemctl start ${SERVICE_NAME}"
            fi
        else
            echo "  - Systemd not available"
        fi
        echo ""
    fi
    
    echo -e "${BOLD}Access Information:${NC}"
    echo "  - Local URL: http://localhost:${PORT}"
    if command -v hostname &> /dev/null; then
        echo "  - Server URL: http://$(hostname -I | awk '{print $1}'):${PORT}"
    fi
    echo ""
    
    if [[ -n "${DISCORD_CLIENT_ID:-}" ]]; then
        echo -e "${BOLD}Discord Integration:${NC}"
        echo "  - Client ID: Configured"
        if command -v hostname &> /dev/null; then
            echo "  - Callback: http://$(hostname -I | awk '{print $1}'):${PORT}/api/auth/discord/callback"
        fi
        echo ""
    fi
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}Warnings (${#WARNINGS[@]}):${NC}"
        for warning in "${WARNINGS[@]}"; do
            echo "  - ${warning#*] - }"
        done
        echo ""
    fi
    
    echo -e "${BOLD}Useful Commands:${NC}"
    if [[ "$SKIP_SERVICE" != true ]]; then
        echo "  - Check status:   sudo systemctl status ${SERVICE_NAME}"
        echo "  - Start:          sudo systemctl start ${SERVICE_NAME}"
        echo "  - Stop:           sudo systemctl stop ${SERVICE_NAME}"
        echo "  - Restart:        sudo systemctl restart ${SERVICE_NAME}"
        echo "  - View logs:      sudo journalctl -u ${SERVICE_NAME} -f"
    else
        echo "  - Start manually: cd ${INSTALL_DIR} && npm start"
        echo "  - View logs:      cd ${INSTALL_DIR} && npm start"
    fi
    echo "  - Uninstall:      sudo rm -rf ${INSTALL_DIR} /etc/systemd/system/${SERVICE_NAME}.service"
    echo ""
    
    echo -e "${BOLD}Log File:${NC}"
    echo "  - ${LOG_FILE}"
    echo ""
    
    if [[ "$SKIP_SERVICE" != true ]]; then
        echo -e "${CYAN}Next Steps:${NC}"
        echo "  1. Open http://localhost:${PORT} in your browser"
        echo "  2. Complete the initial setup wizard"
        echo "  3. Configure Discord/Telegram integrations if desired"
        echo "  4. Set up reverse proxy (nginx/apache) for production use"
        echo "  5. Configure SSL/TLS certificates"
        echo ""
    fi
    
    echo -e "${GREEN}Enjoy using LavaPanel!${NC}"
    echo ""
}

#-------------------------------------------------------------------------------
#   Main Installation Flow
#-------------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${CYAN}${BOLD}LavaPanel Production Installer v${SCRIPT_VERSION}${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo ""
    
    touch "$LOG_FILE" 2>/dev/null || log_warning "Cannot write to log file: $LOG_FILE"
    log_info "Installation started"
    log_info "Command: $*"
    
    parse_arguments "$@"
    
    check_root
    detect_os
    
    if ! check_dependencies; then
        install_dependencies
    fi
    
    clone_repository
    
    install_npm_dependencies
    
    setup_configuration
    
    setup_systemd_service
    
    configure_firewall
    
    verify_installation
    
    display_summary
    
    log_info "Installation completed successfully"
    
    exit 0
}

# Entry point
main "$@"