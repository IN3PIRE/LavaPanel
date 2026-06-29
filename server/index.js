const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = require('./database');

// Initialize Discord strategy
require('./config/passport');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../panel')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const userRoutes = require('./routes/users');
const themeRoutes = require('./routes/themes');
const apiRoutes = require('./routes/api');

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/register.html'));
});

app.get('/deploy', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/deploy.html'));
});

app.get('/deploy/discord', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/deploy-discord.html'));
});

app.get('/deploy/minecraft', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/deploy-minecraft.html'));
});

const { startDiscordBot } = require('./integrations/discord');
const { startTelegramBot } = require('./integrations/telegram');

// WebSocket for real-time updates
const lavaWs = require('./websocket');

startDiscordBot();
startTelegramBot();

const autoUpdater = require('./utils/auto-update');
autoUpdater.start();

db.initialize()
  .then(() => db.runMigrations())
  .then(() => {
    // Create HTTP server and attach WebSocket
    const server = app.listen(PORT, () => {
      console.log(`🔥 LavaPanel server running on http://localhost:${PORT}`);
      console.log(`🌋 Environment: ${process.env.NODE_ENV}`);
    });
    lavaWs.initialize(server);
    console.log('🌋 WebSocket server attached');
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
