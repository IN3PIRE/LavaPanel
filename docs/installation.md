# 🚀 LavaPanel Installation Guide

Complete guide for installing and configuring LavaPanel.

## Prerequisites

- **Node.js** v16.0.0 or higher
- **npm** v7.0.0 or higher
- **Git**
- **Java 17+** (for Minecraft servers)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/IN3PIRE/LavaPanel.git
cd LavaPanel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env` with your settings:

```bash
# Required
PORT=3000
JWT_SECRET=generate-a-secure-random-string-here
SESSION_SECRET=generate-another-secure-string

# Discord OAuth (get from https://discord.com/developers)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_CALLBACK_URL=http://your-domain.com/api/auth/discord/callback

# Optional
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Visit `http://localhost:3000` to access the panel.

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start LavaPanel
pm2 start server/index.js --name lavapanel

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server/index.js"]
```

```bash
# Build image
docker build -t lavapanel .

# Run container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --name lavapanel \
  lavapanel
```

### Using systemd

Create `/etc/systemd/system/lavapanel.service`:

```ini
[Unit]
Description=LavaPanel Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/lavapanel
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/var/www/lavapanel/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable lavapanel
sudo systemctl start lavapanel
sudo systemctl status lavapanel
```

## Discord Bot Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy bot token to `.env`

### 2. Configure OAuth2

1. Go to "OAuth2" → "General"
2. Add redirect URL: `http://your-domain.com/api/auth/discord/callback`
3. Copy Client ID and Client Secret to `.env`

### 3. Invite Bot

Generate invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your actual client ID.

## Telegram Bot Setup

### 1. Create Bot

1. Message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Follow instructions
4. Copy token to `.env`

### 2. Configure Commands

Send to BotFather:
```
/setcommands
your_bot_name
start - Start the bot
status - Check server status
coins - View coin balance
help - Get help
link - Link your account
```

## Database Migration

```bash
# Run migrations
npm run migrate
```

Database is auto-created on first start at `./data/lavapanel.db`

## SSL/HTTPS Setup

### Using Nginx

Install Nginx:
```bash
sudo apt install nginx
```

Create `/etc/nginx/sites-available/lavapanel`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/lavapanel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Using Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Errors

```bash
# Delete and recreate database
rm data/lavapanel.db
npm run migrate
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R $(whoami) ./data

# Fix permissions
chmod -R 755 .
```

### Discord OAuth Not Working

- Verify redirect URL matches exactly
- Check bot token is correct
- Ensure bot is invited to server
- Check Discord developer portal settings

## Updating

```bash
# Pull latest changes
git pull origin main

# Install updated dependencies
npm install

# Restart server
pm2 restart lavapanel
# or
sudo systemctl restart lavapanel
```

Auto-update is enabled by default and checks every hour.

## Support

- **Documentation**: https://github.com/IN3PIRE/LavaPanel/tree/main/docs
- **Discord Server**: [Join here]
- **GitHub Issues**: https://github.com/IN3PIRE/LavaPanel/issues
