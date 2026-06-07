class Deployer {
  constructor() {
    this.servers = new Map();
    this.processes = new Map();
  }

  async deploy(options) {
    const { type, name, config, userId } = options;

    if (type === 'discord') {
      return this.deployDiscordBot(name, config, userId);
    } else if (type === 'minecraft') {
      return this.deployMinecraftServer(name, config, userId);
    } else {
      throw new Error(`Unsupported server type: ${type}`);
    }
  }

  async deployDiscordBot(name, config, userId) {
    const serverId = this.generateServerId();
    const serverPath = `./servers/${userId}/${serverId}`;

    // Create bot template
    const botCode = `
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log('✅ Bot is ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'ping') {
    interaction.reply('Pong! 🏓');
  }
});

client.login(process.env.BOT_TOKEN);
    `.trim();

    await this.createServerFiles(serverPath, {
      'index.js': botCode,
      '.env': `BOT_TOKEN=${config.token}`,
      'package.json': JSON.stringify({
        name: name,
        version: '1.0.0',
        description: 'Discord bot deployed by LavaPanel',
        main: 'index.js',
        dependencies: {
          'discord.js': '^14.11.0'
        }
      }, null, 2)
    });

    this.servers.set(serverId, {
      id: serverId,
      name,
      type: 'discord',
      status: 'stopped',
      path: serverPath,
      config
    });

    return { serverId, path: serverPath };
  }

  async deployMinecraftServer(name, config, userId) {
    const serverId = this.generateServerId();
    const serverPath = `./servers/${userId}/${serverId}`;

    const serverProperties = `
server-port=${config.port || 25565}
gamemode=survival
difficulty=normal
max-players=${config.maxPlayers || 20}
motd=${config.motd || 'LavaPanel Minecraft Server'}
view-distance=10
online-mode=true
enable-command-block=false
spawn-protection=16
    `.trim();

    const eula = `
eula=true
    `.trim();

    await this.createServerFiles(serverPath, {
      'server.properties': serverProperties,
      'eula.txt': eula,
      'start.sh': `#!/bin/bash
java -Xmx${config.ram || '2G'} -jar server.jar nogui
      `,
      'config.json': JSON.stringify(config, null, 2)
    });

    this.servers.set(serverId, {
      id: serverId,
      name,
      type: 'minecraft',
      status: 'stopped',
      path: serverPath,
      config
    });

    return { serverId, path: serverPath };
  }

  async createServerFiles(path, files) {
    const fs = require('fs').promises;
    await fs.mkdir(path, { recursive: true });
    
    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(`${path}/${filename}`, content);
    }
  }

  async start(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const { spawn } = require('child_process');
    
    let command;
    if (server.type === 'discord') {
      command = 'node index.js';
    } else if (server.type === 'minecraft') {
      command = `bash start.sh`;
    }

    const process = spawn(command, {
      cwd: server.path,
      shell: true,
      stdio: 'pipe'
    });

    process.stdout.on('data', (data) => {
      console.log(`[${server.name}] ${data}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`[${server.name}] ${data}`);
    });

    this.processes.set(serverId, process);
    server.status = 'running';

    return { pid: process.pid };
  }

  async stop(serverId) {
    const process = this.processes.get(serverId);
    const server = this.servers.get(serverId);

    if (!process) {
      throw new Error('Server is not running');
    }

    process.kill();
    this.processes.delete(serverId);
    server.status = 'stopped';

    return { message: 'Server stopped' };
  }

  async restart(serverId) {
    await this.stop(serverId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.start(serverId);
  }

  async delete(serverId) {
    const fs = require('fs').promises;
    const server = this.servers.get(serverId);

    if (!server) {
      throw new Error('Server not found');
    }

    if (this.processes.has(serverId)) {
      await this.stop(serverId);
    }

    await fs.rm(server.path, { recursive: true, force: true });
    this.servers.delete(serverId);

    return { message: 'Server deleted' };
  }

  list(userId) {
    return Array.from(this.servers.values()).filter(s => 
      userId ? s.userId === userId : true
    );
  }

  getLogs(serverId) {
    // TODO: Implement log retrieval
    return [];
  }

  generateServerId() {
    return 'srv_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = Deployer;
