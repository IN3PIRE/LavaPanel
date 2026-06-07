# 📖 LavaPanel Documentation

Complete documentation for LavaPanel server management panel.

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/IN3PIRE/LavaPanel.git
cd LavaPanel

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start the server
npm start
```

### Configuration

Required environment variables:

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret for JWT tokens
- `SESSION_SECRET` - Secret for express-session
- `DISCORD_CLIENT_ID` - Discord OAuth application ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth secret
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (optional)

## Features

### Phase 1: Core Panel ✅
- User authentication (email/password + Discord OAuth)
- Server deployment UI
- Lava-inspired theme design

### Phase 2: Integrations ✅
- Discord bot integration
- Telegram bot integration
- User registration via Discord
- Coin/reward system

### Phase 3: Community Features ✅
- Theme library system
- Community theme submission
- Auto-update mechanism

### Phase 4: Advanced Features 🚧
- Multi-server management
- Resource monitoring
- Backup systems
- API for extensions

## API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/discord` - Login with Discord OAuth
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

## Discord Bot Commands

- `/register <email>` - Link Discord account
- `/coins` - Check coin balance
- `/giveaway <duration> <prize>` - Create giveaway (admin only)

## Telegram Bot Commands

- `/start` - Welcome message
- `/status` - Check server status
- `/coins` - Check coin balance
- `/help` - Get help
- `/link <email>` - Link Telegram account

## Architecture

```
LavaPanel/
├── panel/              # Frontend HTML/CSS/JS
├── server/             # Backend Node.js server
│   ├── config/         # Configuration files
│   ├── routes/         # API routes
│   ├── integrations/   # Discord/Telegram bots
│   └── utils/          # Utility functions
├── deployer/           # Server deployment engine
├── themes/             # Theme library
├── docs/               # Documentation
└── data/               # SQLite database (auto-created)
```

## Contributing

We welcome contributions! Please see our contributing guidelines.

## License

MIT License - See LICENSE file for details
