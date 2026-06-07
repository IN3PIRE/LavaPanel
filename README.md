# 🔥 LavaPanel

**Easy-to-use server management panel for Discord bots & Minecraft servers — No Docker required!**

[![License: MIT](https://img.shields.io/badge/License-MIT-ff6b35.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-ff8c5a)](https://nodejs.org/)
[![Discord](https://img.shields.io/badge/Discord-5865F2?logo=discord)](https://discord.com/)
[![Telegram](https://img.shields.io/badge/Telegram-24A1DE?logo=telegram)](https://telegram.org/)

---

## 🌋 Vision

LavaPanel is an open-source server management panel inspired by Pterodactyl Panel, designed to make deploying and managing Discord bots and Minecraft servers effortless. Unlike Pterodactyl, LavaPanel doesn't require Docker, making it more accessible and lightweight.

## ✨ Key Features

### Core Capabilities
- **🚀 Easy Deployment** - One-click deployment for Discord bots and Minecraft servers
- **🔄 Auto-Update** - Panel updates automatically via GitHub every hour
- **🎨 No Docker Required** - Lightweight alternative to Pterodactyl Panel
- **🌐 Open Source** - Community-driven development (MIT License)
- **🔐 Secure Auth** - JWT + Session management with Discord OAuth2
- **💰 Coin System** - Built-in reward system for community engagement

### Integrations
- **✅ Discord Bot Integration** - OAuth login, user registration, coin system, giveaways
- **✅ Telegram Bot Integration** - Server status, notifications, account linking
- **✅ Community Theme Library** - 3 pre-built themes (Lava, Midnight, Forest) with easy customization
- **✅ Giveaway System** - Automated community giveaways with participant tracking

### Unique Features
- **Unique Signup Flow** - Innovative user registration via Discord/Telegram
- **Theme System** - Built-in lava theme with community theme support
- **Lightweight** - No Docker overhead, runs on bare metal or any VPS
- **Auto-Updates** - Self-updating from GitHub with version comparison

## 🛣️ Roadmap

### Phase 1: Core Panel
**Status:** ✅ **COMPLETE** (100%)

- [x] Basic panel UI with lava theme
- [x] User authentication system (email/password + Discord OAuth)
- [x] Server deployment engine
- [x] Discord bot deployment templates
- [x] Minecraft server deployment templates

### Phase 2: Integrations
**Status:** ✅ **COMPLETE** (100%)

- [x] Discord bot integration (OAuth + commands)
- [x] Telegram bot integration (status + notifications)
- [x] User registration via Discord
- [x] Coin/reward system with API endpoints

### Phase 3: Community Features
**Status:** ✅ **COMPLETE** (100%)

- [x] Theme library system (3 themes included)
- [x] Community theme submission support
- [x] Auto-update mechanism (hourly checks)
- [x] Giveaway system for Discord communities

### Phase 4: Advanced Features
**Status:** 🚧 **IN PROGRESS** (0%)

- [ ] Multi-server management UI improvements
- [ ] Resource monitoring (CPU/RAM/Disk)
- [ ] Backup/restore systems
- [ ] Plugin marketplace
- [ ] WebSocket for real-time logs
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit + integration tests

## 🎨 Theme Concept

The panel features a **lava-inspired design** with:
- 🔥 Warm color palette (oranges, reds, yellows)
- 🌋 Dynamic, flowing UI elements with particle animations
- ⚡ Modern, energetic aesthetic
- 🎯 Clean, usable interface
- 🌙 Multiple themes available (Lava, Midnight, Forest)

## 🏗️ Architecture

```
LavaPanel/
├── panel/              # Frontend HTML/CSS/JS (login, register, dashboard)
├── server/             # Backend Node.js server
│   ├── config/         # Passport OAuth configuration
│   ├── routes/         # REST API routes (auth, servers, users, themes)
│   ├── integrations/   # Discord & Telegram bots
│   └── utils/          # Auto-updater and utilities
├── deployer/           # Server deployment engine (Discord/Minecraft)
├── themes/             # Theme library (JSON configs)
├── docs/               # Documentation (installation, templates)
└── data/               # SQLite database (auto-created)
```

## 🚀 Quick Start

### ⚡ One-Command Installation (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/IN3PIRE/LavaPanel/main/install.sh | bash
```

Or download and run manually:

```bash
wget https://raw.githubusercontent.com/IN3PIRE/LavaPanel/main/install.sh
chmod +x install.sh
./install.sh
```

The interactive installer will:
- ✅ Check system requirements
- ✅ Install Node.js and dependencies
- ✅ Clone the repository
- ✅ Install npm packages
- ✅ Configure environment (Discord/Telegram)
- ✅ Set up PM2 for production
- ✅ Start the server

### 📦 Manual Installation

```bash
# Clone the repository
git clone https://github.com/IN3PIRE/LavaPanel.git
cd LavaPanel

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord/Telegram credentials

# Start the server
npm start
```

Visit `http://localhost:3000` to access the panel.

### Environment Configuration

Required `.env` variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# Discord OAuth (get from https://discord.com/developers)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_CALLBACK_URL=http://your-domain.com/api/auth/discord/callback

# Telegram Bot (get from @BotFather)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Auto Update
GITHUB_REPO=IN3PIRE/LavaPanel
AUTO_UPDATE_INTERVAL=3600000
```

### Production Deployment

**Using PM2:**
```bash
npm install -g pm2
pm2 start server/index.js --name lavapanel
pm2 save
pm2 startup
```

**Using Docker:**
```bash
docker build -t lavapanel .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --env-file .env --name lavapanel lavapanel
```

**Using systemd:**
```bash
sudo systemctl enable lavapanel
sudo systemctl start lavapanel
```

See [docs/installation.md](docs/installation.md) for detailed guides.

## 📚 Documentation

- [Installation Guide](docs/installation.md) - Complete setup instructions
- [Minecraft Templates](docs/minecraft-templates.md) - Vanilla, Spigot, Paper, Forge, Bedrock
- [Discord Templates](docs/discord-templates.md) - Basic, Music, Moderation, Welcome bots
- [Contributing](CONTRIBUTING.md) - How to contribute
- [License](LICENSE) - MIT License

## 🤖 Bot Commands

### Discord Bot
- `/register <email>` - Link Discord account to panel
- `/coins` - Check your coin balance
- `/giveaway <duration> <prize>` - Create giveaway (admin only)

### Telegram Bot
- `/start` - Welcome message
- `/status` - Check your server status
- `/coins` - View coin balance
- `/help` - Get help
- `/link <email>` - Link Telegram account

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/discord` - Discord OAuth login
- `POST /api/auth/logout` - Logout

### Servers
- `GET /api/servers` - List user's servers
- `POST /api/servers/create` - Create new server
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server
- `DELETE /api/servers/:id` - Delete server

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/coins` - Get coin balance
- `POST /api/users/coins/add` - Add coins

### Themes
- `GET /api/themes` - List all themes
- `GET /api/themes/active` - Get active theme
- `POST /api/themes/activate/:id` - Activate theme

### System
- `GET /api/health` - Health check
- `GET /api/stats` - Platform statistics
- `GET /api/version` - Version information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas Needing Help
- **High Priority:** Resource monitoring, backup system, API documentation, unit tests
- **Medium Priority:** More templates, plugin marketplace, mobile responsive design
- **Low Priority:** Additional themes, documentation translations, tutorial videos

## 📊 Stats

- **Total Lines of Code:** ~3,500+
- **Files:** 30+
- **Themes:** 3 (Lava, Midnight, Forest)
- **API Endpoints:** 15+
- **Supported Platforms:** Discord, Telegram, Web

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, SQLite3
- **Authentication:** Passport.js (Discord OAuth), JWT, express-session
- **Bots:** Discord.js v14, node-telegram-bot-api
- **Frontend:** Vanilla HTML/CSS/JS with lava-inspired animations
- **Deployment:** PM2, Docker, systemd
- **Auto-Update:** GitHub API integration

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Pterodactyl Panel](https://pterodactyl.io/) - But simpler, lighter, and without Docker requirements
- Built with 🔥 by the LavaPanel community
- Theme system inspired by community feedback

---

**🌋 LavaPanel** - Server management made easy. No Docker, no hassle, just deploy.

[Report Bug](https://github.com/IN3PIRE/LavaPanel/issues) · [Request Feature](https://github.com/IN3PIRE/LavaPanel/issues) · [Join Discord](#)