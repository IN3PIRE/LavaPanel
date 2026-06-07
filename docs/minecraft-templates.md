# Minecraft Server Templates

Pre-configured templates for deploying Minecraft servers via LavaPanel.

## Available Templates

### Vanilla Minecraft
The classic Minecraft server experience.

**Requirements:**
- Java 17+
- Minimum 2GB RAM
- server.jar (Mojang official)

**Configuration:**
```json
{
  "version": "1.20.1",
  "ram": "2G",
  "port": 25565,
  "maxPlayers": 20,
  "difficulty": "normal",
  "gamemode": "survival"
}
```

### Spigot
Optimized server with plugin support.

**Requirements:**
- Java 17+
- Minimum 3GB RAM
- spigot-1.20.1.jar

**Configuration:**
```json
{
  "version": "1.20.1",
  "ram": "3G",
  "port": 25565,
  "maxPlayers": 50,
  "plugins": [
    "EssentialsX",
    "WorldEdit",
    "LuckPerms"
  ]
}
```

### Paper
High-performance Spigot fork.

**Requirements:**
- Java 17+
- Minimum 3GB RAM
- paper-1.20.1.jar

**Configuration:**
```json
{
  "version": "1.20.1",
  "ram": "4G",
  "port": 25565,
  "maxPlayers": 100,
  "viewDistance": 12,
  "simulationDistance": 12
}
```

### Forge (Modded)
Minecraft Forge for modpacks.

**Requirements:**
- Java 17+
- Minimum 4GB RAM (6GB+ for large modpacks)
- forge-installer.jar

**Configuration:**
```json
{
  "version": "1.20.1",
  "ram": "6G",
  "port": 25565,
  "maxPlayers": 30,
  "modpack": "Better MC",
  "javaArgs": "-XX:+UseG1GC"
}
```

### Bedrock (Geyser)
Allow Bedrock players to join Java servers.

**Requirements:**
- Java server running
- Geyser-Spigot plugin
- Floodgate plugin (optional)

**Configuration:**
```json
{
  "version": "1.20.1",
  "ram": "4G",
  "port": 25565,
  "bedrockPort": 19132,
  "geyser": true
}
```

## Deployment Steps

1. **Choose Template**: Select your server type from the panel
2. **Configure**: Set RAM, player count, and other options
3. **Deploy**: Click "Deploy Server"
4. **Upload JAR**: Upload your server jar file
5. **Accept EULA**: Edit eula.txt to accept
6. **Start**: Click "Start Server"

## Server Properties

Common server.properties settings:

```properties
server-port=25565
gamemode=survival
difficulty=normal
max-players=20
motd=My LavaPanel Server
view-distance=10
online-mode=true
pvp=true
allow-flight=false
spawn-protection=16
```

## Performance Tips

### Server Optimization
- Use PaperMC instead of vanilla for better performance
- Allocate appropriate RAM (not too much, not too little)
- Reduce view distance for lag reduction
- Use performance plugins:
  - Chunky (pre-generate chunks)
  - ClearLag (remove entities)
  - Spark (profiling)

### JVM Arguments
```bash
# Optimized JVM flags for Java 17+
java -Xms2G -Xmx4G \
  -XX:+UseG1GC \
  -XX:G1HeapRegionSize=4M \
  -XX:MaxGCPauseMillis=100 \
  -jar server.jar nogui
```

## Troubleshooting

### Server Won't Start
- Check Java version: `java -version`
- Verify jar file is correct
- Check logs in panel for errors
- Ensure port is not in use

### Lag Issues
- Reduce view distance
- Limit redstone contraptions
- Use performance mods/plugins
- Monitor RAM usage

### Connection Problems
- Check firewall settings
- Verify port forwarding
- Ensure server is online
- Check server IP and port

## Backup & Restore

### Creating Backups
```bash
# Manual backup
cp -r server-world ../backup-$(date +%Y%m%d)

# Or use panel backup feature
```

### Restoring Backup
```bash
# Stop server
# Replace world folder
rm -rf server-world
cp -r ../backup-20260107 server-world
# Start server
```

## Support

For issues or questions:
- Check documentation
- Join our Discord server
- Open GitHub issue
