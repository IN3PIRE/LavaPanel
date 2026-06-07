const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/lavapanel.db');

let db;

const initialize = () => {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      console.log('📦 Database connected:', DB_PATH);
      resolve();
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          username TEXT UNIQUE,
          password_hash TEXT,
          discord_id TEXT UNIQUE,
          telegram_id TEXT UNIQUE,
          avatar_url TEXT,
          coins INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT,
          type TEXT,
          status TEXT DEFAULT 'stopped',
          config TEXT,
          port INTEGER,
          path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS themes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          author TEXT,
          config TEXT,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          token TEXT UNIQUE,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO themes (name, author, config, is_active)
        VALUES ('lava', 'LavaPanel', '{"primary":"#ff6b35","secondary":"#ff8c5a","background":"#1a0a0a"}', 1)
      `);

      resolve();
    });
  });
};

const getDB = () => db;

module.exports = { initialize, createTables, getDB };
