const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'lavapanel.db');

let db;

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'lavapanel-default-key').digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function initialize() {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      console.log('📦 Database connected:', DB_PATH);
      resolve();
    });
  });
}

function runMigrations() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password_hash TEXT,
          discord_id TEXT UNIQUE,
          discord_avatar TEXT,
          telegram_id TEXT UNIQUE,
          role TEXT DEFAULT 'user',
          coins INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('discord', 'minecraft', 'telegram')),
          template TEXT,
          status TEXT DEFAULT 'stopped' CHECK(status IN ('running', 'stopped', 'error', 'deploying')),
          config TEXT DEFAULT '{}',
          pid INTEGER,
          port INTEGER,
          deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS themes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          author TEXT,
          version TEXT DEFAULT '1.0.0',
          css_variables TEXT DEFAULT '{}',
          is_community INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          file_path TEXT,
          size_bytes INTEGER,
          encrypted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS webhook_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id TEXT NOT NULL,
          platform TEXT NOT NULL CHECK(platform IN ('discord', 'telegram', 'slack')),
          webhook_url TEXT,
          events TEXT DEFAULT '[]',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
          sid TEXT PRIMARY KEY,
          expires DATETIME,
          data TEXT
        );

        INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1.0.0');
      `, (err) => {
        if (err) return reject(err);
        console.log('✅ Database migrations complete');
        // Seed default admin after migrations
        seedDefaultAdmin()
          .then(() => resolve())
          .catch((seedErr) => {
            console.warn('⚠️ Admin seed skipped (non-fatal):', seedErr.message);
            resolve();
          });
      });
    });
  });
}

function seedDefaultAdmin() {
  return new Promise((resolve, reject) => {
    // Only seed if no admin exists
    db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, row) => {
      if (err) return reject(err);
      if (row.count > 0) {
        console.log('👤 Admin user already exists, skipping seed');
        return resolve();
      }

      const username = 'admin';
      const email = 'admin@lavapanel.local';
      const password = 'admin123';

      bcrypt.hash(password, 10, (err, hash) => {
        if (err) return reject(err);
        db.run(
          'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
          [username, email, hash, 'admin'],
          function(err) {
            if (err) return reject(err);
            console.log('👤 Default admin created — login: admin / admin123');
            resolve();
          }
        );
      });
    });
  });
}

function getDb() {
  return db;
}

function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initialize,
  runMigrations,
  getDb,
  close,
  encrypt,
  decrypt,
  seedDefaultAdmin
};
