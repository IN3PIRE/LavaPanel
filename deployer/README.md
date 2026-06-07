# 🍞 Deployer

Server deployment engine for LavaPanel. Handles creation, configuration, and lifecycle management of Discord bots and Minecraft servers.

## Features

- **Template-based deployment** - Pre-configured templates for popular server types
- **Resource management** - Automatic port allocation and resource limits
- **Process monitoring** - Watchdog system to keep servers running
- **Log aggregation** - Centralized logging for all deployed servers

## Supported Server Types

### Discord Bots
- Discord.js template
- Music bots
- Moderation bots
- Utility bots

### Minecraft Servers
- Vanilla Minecraft
- Spigot/Paper
- Forge/Modpacks
- Bedrock Edition (via Geyser)

## Usage

```javascript
const Deployer = require('./deployer');

const deployer = new Deployer();

// Deploy a Discord bot
await deployer.deploy({
  type: 'discord',
  name: 'my-bot',
  config: {
    token: 'BOT_TOKEN',
    prefix: '!'
  }
});

// Deploy a Minecraft server
await deployer.deploy({
  type: 'minecraft',
  name: 'survival-server',
  config: {
    version: '1.20.1',
    ram: '4G',
    port: 25565
  }
});
```

## API

### `deploy(options)`
Creates and starts a new server instance.

### `stop(serverId)`
Stops a running server.

### `restart(serverId)`
Restarts a server.

### `delete(serverId)`
Deletes a server and all its data.

### `list(userId)`
Lists all servers for a user.

### `getLogs(serverId)`
Retrieves server logs.
