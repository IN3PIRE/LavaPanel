#!/bin/bash

# 🔥 LavaPanel Installation Script
# Interactive installer for LavaPanel server management panel
# Supports: Ubuntu, Debian, CentOS, Fedora, macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Progress bar function
show_progress() {
    local duration=$1
    local bar_width=50
    for ((i=0; i<=bar_width; i++)); do
        echo -ne "\r${CYAN}Progress: [$(printf '%*s' $i | tr ' ' '█')$(printf '%*s' $((bar_width-i)) | tr ' ' '░')] $((i*100/bar_width))%${NC}"
        sleep 0.05
    done
    echo -ne "\n"
}

# Animated title
show_title() {
    clear
    echo -e "${RED}"
    echo " _                   _       _   "
    echo "| |    _____   _____| | __  | |  "
    echo "| |   / _ \ \ / / _ \ |/ /  | |  "
    echo "| |__| (_) \ V /  __/   <   |_|  "
    echo "|_____\___/ \_/ \___|_|\_\  (_)  "
    echo "                                 "
    echo "🔥 Server Management Panel 🔥"
    echo -e "${NC}"
    echo -e "${ORANGE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Welcome message
show_welcome() {
    echo -e "${GREEN}Welcome to LavaPanel! 🌋${NC}"
    echo -e "${CYAN}The easiest way to manage Discord bots and Minecraft servers${NC}\n"
    echo -e "${YELLOW}This installer will:${NC}"
    echo -e "  ✅ Check system requirements"
    echo -e "  ✅ Install Node.js and dependencies"
    echo -e "  ✅ Clone the repository"
    echo -e "  ✅ Install npm packages"
    echo -e "  ✅ Configure environment"
    echo -e "  ✅ Set up Discord/Telegram bots (optional)"
    echo -e "  ✅ Start the server\n"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  Running as root is not recommended.${NC}"
        echo -e "${YELLOW}Consider creating a regular user first.${NC}\n"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Installation cancelled.${NC}"
            exit 1
        fi
    fi
}

# Detect OS
detect_os() {
    echo -e "${BLUE}📊 Detecting operating system...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        echo -e "${GREEN}✓ Detected: macOS${NC}"
    elif [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        echo -e "${GREEN}✓ Detected: $NAME $VERSION${NC}"
    else
        OS="unknown"
        echo -e "${RED}✗ Could not detect OS, assuming Ubuntu/Debian${NC}"
        OS="ubuntu"
    fi
}

# Check requirements
check_requirements() {
    echo -e "\n${BLUE}🔍 Checking system requirements...${NC}\n"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
    else
        echo -e "${YELLOW}✗ Node.js not found${NC}"
        read -p "Install Node.js 18.x? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_nodejs
        else
            echo -e "${RED}Installation cancelled. Node.js is required.${NC}"
            exit 1
        fi
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
    else
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        echo -e "${GREEN}✓ Git installed: $GIT_VERSION${NC}"
    else
        echo -e "${YELLOW}✗ Git not found${NC}"
        read -p "Install Git? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_git
        else
            echo -e "${RED}Installation cancelled. Git is required.${NC}"
            exit 1
        fi
    fi
    
    # Check available disk space
    DISK_SPACE=$(df -h . | awk 'NR==2 {print $4}')
    echo -e "${GREEN}✓ Available disk space: $DISK_SPACE${NC}"
    
    # Check available memory
    if [[ "$OSTYPE" == "darwin"* ]]; then
        MEMORY=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.2f GB\n", $1/1024/1024/1024}' || echo "Unknown")
    else
        MEMORY=$(free -h 2>/dev/null | awk 'NR==2 {printf "%s\n", $2}' || echo "Unknown")
    fi
    echo -e "${GREEN}✓ Available memory: $MEMORY${NC}"
}

# Install Node.js
install_nodejs() {
    echo -e "\n${BLUE}📦 Installing Node.js 18.x...${NC}"
    
    case $OS in
        ubuntu|debian)
            echo -e "${CYAN}Updating package lists...${NC}"
            apt-get update -qq
            
            echo -e "${CYAN}Installing curl...${NC}"
            apt-get install -y -qq curl
            
            echo -e "${CYAN}Adding NodeSource repository...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
            
            echo -e "${CYAN}Installing Node.js...${NC}"
            apt-get install -y nodejs
            ;;
        fedora|centos|rhel)
            echo -e "${CYAN}Installing Node.js from NodeSource...${NC}"
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
            yum install -y nodejs > /dev/null 2>&1
            ;;
        macos)
            if ! command -v brew &> /dev/null; then
                echo -e "${YELLOW}Homebrew not found. Installing...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node
            ;;
        *)
            echo -e "${RED}Unsupported OS for Node.js installation${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Node.js installed successfully${NC}"
}

# Install Git
install_git() {
    echo -e "\n${BLUE}📦 Installing Git...${NC}"
    
    case $OS in
        ubuntu|debian)
            apt-get update -qq > /dev/null 2>&1
            apt-get install -y -qq git
            ;;
        fedora|centos|rhel)
            yum install -y git > /dev/null 2>&1
            ;;
        macos)
            brew install git
            ;;
        *)
            echo -e "${RED}Unsupported OS for Git installation${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Git installed successfully${NC}"
}

# Clone repository
clone_repo() {
    echo -e "\n${BLUE}📥 Cloning LavaPanel repository...${NC}"
    
    if [ -d "LavaPanel" ]; then
        echo -e "${YELLOW}⚠️  LavaPanel directory already exists${NC}"
        read -p "Remove and reclone? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf LavaPanel
            git clone https://github.com/IN3PIRE/LavaPanel.git
            cd LavaPanel
            echo -e "${GREEN}✓ Repository cloned successfully${NC}"
        else
            cd LavaPanel
            echo -e "${GREEN}✓ Using existing directory${NC}"
        fi
    else
        git clone https://github.com/IN3PIRE/LavaPanel.git
        cd LavaPanel
        echo -e "${GREEN}✓ Repository cloned successfully${NC}"
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "\n${BLUE}📦 Installing npm dependencies...${NC}"
    show_progress 3
    npm install --legacy-peer-deps > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
}

# Configure environment
configure_env() {
    echo -e "\n${BLUE}⚙️  Configuring environment...${NC}\n"
    
    if [ -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file already exists${NC}"
        read -p "Overwrite? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}✓ Using existing configuration${NC}"
            return
        fi
    fi
    
    cp .env.example .env
    
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  Environment Configuration${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Get server port
    read -p "Enter server port [3000]: " PORT
    PORT=${PORT:-3000}
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/PORT=3000/PORT=$PORT/" .env
    else
        sed -i "s/PORT=3000/PORT=$PORT/" .env
    fi
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
    fi
    
    echo -e "\n${GREEN}✓ Generated secure JWT and Session secrets${NC}"
    
    # Discord OAuth setup
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Discord Bot Configuration${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${YELLOW}To get Discord credentials:${NC}"
    echo -e "1. Go to https://discord.com/developers/applications"
    echo -e "2. Create a new application"
    echo -e "3. Go to 'OAuth2' → 'General'"
    echo -e "4. Add redirect URL: http://localhost:$PORT/api/auth/discord/callback\n"
    
    read -p "Configure Discord OAuth now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter Discord Client ID: " DISCORD_CLIENT_ID
        read -p "Enter Discord Client Secret: " DISCORD_CLIENT_SECRET
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DISCORD_CLIENT_ID=.*|DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID|" .env
            sed -i '' "s|DISCORD_CLIENT_SECRET=.*|DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET|" .env
            sed -i '' "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=http://localhost:$PORT/api/auth/discord/callback|" .env
        else
            sed -i "s|DISCORD_CLIENT_ID=.*|DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID|" .env
            sed -i "s|DISCORD_CLIENT_SECRET=.*|DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET|" .env
            sed -i "s|DISCORD_CALLBACK_URL=.*|DISCORD_CALLBACK_URL=http://localhost:$PORT/api/auth/discord/callback|" .env
        fi
        
        echo -e "${GREEN}✓ Discord OAuth configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Discord OAuth skipped. You can configure it later in .env${NC}"
    fi
    
    # Telegram Bot setup
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Telegram Bot Configuration${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${YELLOW}To get Telegram bot token:${NC}"
    echo -e "1. Message @BotFather on Telegram"
    echo -e "2. Send /newbot and follow instructions"
    echo -e "3. Copy the bot token\n"
    
    read -p "Configure Telegram Bot now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter Telegram Bot Token: " TELEGRAM_BOT_TOKEN
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN|" .env
        else
            sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN|" .env
        fi
        
        echo -e "${GREEN}✓ Telegram Bot configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Telegram Bot skipped. You can configure it later in .env${NC}"
    fi
    
    # Cleanup backup files
    rm -f .env.bak 2>/dev/null || true
    
    echo -e "\n${GREEN}✓ Environment configuration complete${NC}"
}

# Install PM2 (optional)
install_pm2() {
    echo -e "\n${BLUE}🔧 Setting up process manager...${NC}"
    echo -e "\n${YELLOW}PM2 is recommended for production deployments.${NC}"
    echo -e "It keeps your server running and automatically restarts on crashes.\n"
    
    read -p "Install PM2? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g pm2 > /dev/null 2>&1
        echo -e "${GREEN}✓ PM2 installed globally${NC}"
        
        read -p "Start LavaPanel with PM2 now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pm2 start server/index.js --name lavapanel > /dev/null 2>&1
            pm2 save > /dev/null 2>&1
            echo -e "${GREEN}✓ LavaPanel started with PM2${NC}"
            return 0
        fi
    fi
    return 1
}

# Start server
start_server() {
    echo -e "\n${BLUE}🚀 Starting LavaPanel...${NC}"
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q lavapanel; then
        echo -e "${GREEN}✓ LavaPanel already running via PM2${NC}"
        pm2 status lavapanel
        return
    fi
    
    read -p "Start server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v pm2 &> /dev/null; then
            pm2 start server/index.js --name lavapanel > /dev/null 2>&1
            pm2 save > /dev/null 2>&1
            echo -e "${GREEN}✓ Server started with PM2${NC}"
        else
            echo -e "${YELLOW}Starting in development mode...${NC}"
            echo -e "${CYAN}Server will run in foreground. Press Ctrl+C to stop.${NC}\n"
            nohup npm start > lavapanel.log 2>&1 &
            SERVER_PID=$!
            echo $SERVER_PID > /tmp/lavapanel.pid
            echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
            echo -e "${CYAN}Logs available at: lavapanel.log${NC}"
        fi
    fi
}

# Show final status
show_status() {
    clear
    show_title
    
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}          🎉 ${GREEN}Installation Complete!${NC} 🎉           ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${CYAN}LavaPanel has been successfully installed!${NC}\n"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  Quick Start Guide${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}1.${NC} Access the panel:"
    echo -e "   ${GREEN}http://localhost:3000${NC}\n"
    
    echo -e "${BLUE}2.${NC} Manage the server:"
    if command -v pm2 &> /dev/null; then
        echo -e "   ${GREEN}pm2 status lavapanel${NC} - Check status"
        echo -e "   ${GREEN}pm2 logs lavapanel${NC} - View logs"
        echo -e "   ${GREEN}pm2 restart lavapanel${NC} - Restart"
        echo -e "   ${GREEN}pm2 stop lavapanel${NC} - Stop"
    else
        echo -e "   ${GREEN}npm start${NC} - Start server"
        echo -e "   ${GREEN}Ctrl+C${NC} - Stop server"
    fi
    echo
    
    echo -e "${BLUE}3.${NC} Next steps:"
    echo -e "   • Complete Discord OAuth setup in .env"
    echo -e "   • Configure Telegram bot in .env"
    echo -e "   • Register your first user account"
    echo -e "   • Deploy your first Discord bot or Minecraft server\n"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  Useful Commands${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${GREEN}cd LavaPanel${NC} - Enter project directory"
    echo -e "${GREEN}npm run dev${NC} - Start development server"
    echo -e "${GREEN}npm start${NC} - Start production server"
    echo -e "${GREEN}npm test${NC} - Run tests"
    echo -e "${GREEN}git pull${NC} - Update from repository"
    echo
    
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  Documentation & Support${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "📚 Docs: ${CYAN}https://github.com/IN3PIRE/LavaPanel/tree/main/docs${NC}"
    echo -e "🐛 Issues: ${CYAN}https://github.com/IN3PIRE/LavaPanel/issues${NC}"
    echo -e "💬 Discord: ${CYAN}Coming Soon${NC}"
    echo
    
    echo -e "${ORANGE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${ORANGE}  Thank you for installing LavaPanel!${NC}"
    echo -e "${ORANGE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${RED}🔥${NC} ${GREEN}Enjoy managing your servers with LavaPanel!${NC}"
    echo -e "${RED}🌋${NC} ${CYAN}Server management made easy.${NC}\n"
}

# Error handler
handle_error() {
    echo -e "\n${RED}✗ Installation failed at step: $BASH_COMMAND${NC}"
    echo -e "${YELLOW}Try running the installer again or check the logs above.${NC}"
    exit 1
}

trap handle_error ERR

# Main installation flow
main() {
    show_title
    show_welcome
    
    echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
    read -r
    
    check_root
    detect_os
    check_requirements
    clone_repo
    install_dependencies
    configure_env
    install_pm2 || true
    start_server
    show_status
}

# Run installation
main