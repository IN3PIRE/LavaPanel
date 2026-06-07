# Discord Bot Deployment Templates

Pre-configured templates for deploying Discord bots via LavaPanel.

## Available Templates

### Basic Discord Bot
Simple starter bot with basic commands.

**Template Code:**
```javascript
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'ping') {
    interaction.reply('Pong! 🏓');
  }
});

client.login(process.env.BOT_TOKEN);
```

**Required:**
- Discord Bot Token
- Bot invited to server

### Music Bot
Play music in voice channels.

**Features:**
- Play from YouTube, SoundCloud
- Queue management
- Volume control
- DJ roles

**Required:**
- Discord Bot Token
- YouTube API key (optional)
- Premium subscription for high quality

### Moderation Bot
Moderate your server with advanced tools.

**Commands:**
- `/kick` - Kick a user
- `/ban` - Ban a user
- `/mute` - Mute a user
- `/warn` - Warn a user
- `/clear` - Clear messages

**Features:**
- Audit logging
- Auto-moderation
- Warning system
- Temporary mutes

### Welcome Bot
Greet new members automatically.

**Features:**
- Custom welcome messages
- Auto-assign roles
- Verification system
- Captcha verification

### Ticket Bot
Create support ticket systems.

**Features:**
- Create ticket channels
- Multiple categories
- Transcript saving
- Close tickets

## Deployment Steps

1. **Create Bot on Discord**:
   - Go to [Discord Developer Portal](https://discord.com/developers)
   - Create new application
   - Add bot
   - Copy token

2. **Invite Bot**:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot
   ```

3. **Deploy via Panel**:
   - Select template
   - Paste bot token
   - Click "Deploy"
   - Bot starts automatically

4. **Configure Commands**:
   - Edit bot code in panel
   - Save changes
   - Restart bot

## Bot Intents

Required intents for different features:

```javascript
// Basic commands
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
]

// Voice features
intents: [
  ...basicIntents,
  GatewayIntentBits.GuildVoiceStates
]

// Moderation features
intents: [
  ...basicIntents,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration
]
```

## Environment Variables

```bash
# Required
BOT_TOKEN=your_bot_token_here

# Optional
YOUTUBE_API_KEY=your_api_key
DATABASE_URL=mongodb://localhost:27017/bot
PREFIX=!
```

## Best Practices

### Code Organization
```
bot/
├── commands/       # Command files
├── events/         # Event handlers
├── utils/          # Utility functions
├── config/         # Configuration
└── index.js        # Main file
```

### Error Handling
```javascript
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});
```

## Support

For bot development help:
- Discord.js docs: https://discord.js.org/
- Discord Dev Portal: https://discord.com/developers
- Our community Discord server
