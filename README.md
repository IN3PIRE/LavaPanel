# 🔥 LavaPanel – The Ultra‑Professional Server Management Suite

> **LavaPanel** is a sophisticated, open‑source web panel that allows administrators to deploy, monitor, and control Discord bots and Minecraft servers with minimal overhead. Built on the basis of proven patterns and modern tooling, LavaPanel offers the same polishes as monolithic hosting solutions – but without the need for Docker, custom images, or complex infrastructure tutorials.

---

## 🚀 Why LavaPanel?

* **Zero Docker Dependency** – Unlike many competitor panels, LavaPanel is a pure Node‑runtime app. That means you can install it on any V‑PS, bare metal, or even a lightweight cloud instance without worrying about image size or registry access.
* **Full Feature Parity** – Core features such as one‑click deployment, auto‑update, OAuth integration, token management, and real‑time logs are all present and battle‑tested.
* **Developer Friendly** – The codebase follows strict ES2022 conventions, uses TypeScript behind the scenes, and exposes an extensible plugin API for custom workflows.
* **Self‑Updating** – The panel fetches the latest commit from the GitHub repo hourly. The update script checks for semantic version changes and automatically rolls back on failure.
* **Internationalise‑Ready** – Asset bundles are available in *English*, *Spanish*, *French*, *German*, *Italian*, *Portuguese*, *Russian*, and *Chinese*.
* **Compliance & Logging** – All HTTP traffic is logged to a rotating file drive. Exports are available in both JSON and CSV for SOX/PCI‑DSS audit requirements.

## 📦 Quick Installation

The one‑liner is the most recommended method. It handles OS detection, dependency installation, cloning the repo, running npm, and finally starting the panel via **PM2** (recommended for production) or `npm start` for local debugging.

```bash
curl -fsSL https://raw.githubusercontent.com/IN3PIRE/LavaPanel/main/install.sh | bash
```

> **Tip:** On **macOS** or any ARM‑based system, use the platform‑specific suffix (`--arm64`) to automatically pull the native binaries.

### Manual Install Tutorial

1. **Clone the repo**:
   ```bash
   git clone https://github.com/IN3PIRE/LavaPanel.git
   cd LavaPanel
   ```

2. **Install Node** (must be 14+ with npm 8+):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt-get install -y nodejs
   ```

3. **Install dependencies**:
   ```bash
   npm ci --legacy-peer-deps
   ```

4. **Configure environmental variables** – copy the example and set the required values:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and provide:
   - Discord OAuth `DISCORD_CLIENT_ID` & `DISCORD_CLIENT_SECRET`
   - Telegram `TELEGRAM_BOT_TOKEN`
   - `JWT_SECRET`, `SESSION_SECRET`
   - Optional `PORT`, `AUTO_UPDATE_INTERVAL`

5. **Start the application**:
   
   *Production (`pm2`):*
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name lavapanel
   pm2 save
   ```

   *Development:* 
   ```bash
   npm start
   ```

6. **Open the UI** – Point your browser to `http://localhost:<PORT>` (default `3000`).

## 🔧 Feature Set

| Feature | Description |
|---------|-------------|
| **One‑click Bot Deployment** | Installs a Discord or Telegram bot template and forks the repo into your GitHub account.
| **Minecraft Templates** | Deploy a vanilla, Spigot, Paper, Forge, or Bedrock server with pre‑configured Java OpenJDK 17.
| **OAuth 2.0 & JWT** | Secure authentication for Discord, Telegram, and local GitHub accounts with single‑sign‑on.
| **Auto‑Update** | Polls the upstream `main` branch, evaluates commit messages, and performs a graceful restart.
| **WebSocket‑Based Live Log** | Real‑time streaming of server logs; clients auto‑scroll and can filter by keyword.
| **Resource Monitoring** | CPU, RAM, and network usage are displayed per server, with Lorenz curves.
| **Backup & Restore** | On‑demand ZIP backups with optional encryption; restore via file upload.
| **Extensible Plugin API** | Write custom tasks under `plugins/` that hook into server lifecycle events.
| **Theme System** | 3 pre‑built UI themes (Lava, Midnight, Forest). Add custom CSS via the admin panel.
| **RESTful API** | CRUD endpoints for servers, users, logs, and audits. Supports pagination and filtering.
| **Audit Trail** | Each change (deployment, config update, delete) is logged with user ID, timestamp, and diff.
| **Mobile‑Responsive UI** | Fully responsive design ensures operators can manage from phones or tablets.
| **Multi‑Tenant** | Administrators can create multiple tenant accounts and allocate server quotas.
| **Data Encryption** | Sensitive fields like secrets or tokens are encrypted with AES‑256 in the database.

## 🗜️ System Architecture

```
LavaPanel ────────────────────────┬───────────────────────┐
│          ⇑ Repository Update      │  PM2 / systemd        │
│                                      │  Node 18 Runtime      │
├───────┬────────────────────┬──────│
│ panel │ server            │ db   │
├───────┴────────────────────┴──────┘
│      │            │             │
│      │            │             │
│  Templates (Discord, Minecraft)      │
│  ├───homebrew/iOS/…                    │   └─ SQLite (encrypted) ────────
│  └──◂rest─SPI┐                           │   │
│           │        │                           │
└───────────┘        │    Plugins/          │
                     │                      │
                 (scheduled jobs)        │
```

**Key Take‑aways**

* **Event‑Driven** – All plugins listen to a central `EventEmitter`.
* **Performance‑Optimised** – Only the required Node modules are bundled; tree‑shaking ensures minimal memory usage.
* **Democratized** – Every panel install is fully open‑source and package‑controlled.

## 📘 Documentation

| Document | URL |
|---------|------|
| User Guide | https://github.com/IN3PIRE/LavaPanel/blob/main/docs/user_guide.md |
| Admin Guide | https://github.com/IN3PIRE/LavaPanel/blob/main/docs/admin_guide.md |
| API Reference | https://github.com/IN3PIRE/LavaPanel/blob/main/docs/api_reference.md |
| Contribution | https://github.com/IN3PIRE/LavaPanel/blob/main/CONTRIBUTING.md |
| Change Log | https://github.com/IN3PIRE/LavaPanel/blob/main/CHANGELOG.md |

## 🛠️ Development Setup

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Run in watch mode
npm run dev

# Build for production
npm run build
```

> **Tip**: Use `nodemon` for hot‑refresh on `src/` changes.

## 🧪 Build/Test

```bash
# Run tests (Jest + supertest)
npm test

# Coverage report
npm run coverage

# Build Docker image for CI (optional)
docker build -t lavapanel/test .
```

## 🔗 Links & Community

- **GitHub Repository** – https://github.com/IN3PIRE/LavaPanel
- **Discord Community (Support)** – https://discord.gg/your-discuss-guild
- **Telegram Forum** – https://t.me/yourTelegramChannel
- **Reports & Metrics** – Stored in the `logs/` directory; rotate monthly.

## 📜 Licensing

Licensed under the **MIT** license. See the [LICENSE](LICENSE) file for full details.

## 📞 Contact & Support

For issue triage, feature requests, or PR reviews, please use the GitHub issue tracker. Urgent production problems should be routed via our support email: support@in3spire.com. Follow the<|reserved_200173|> download link for the current release and feel free to open a PR.
