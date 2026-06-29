const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Helper: create a fresh db module at a temp path
 */
function createFreshDb(dbPath) {
  process.env.DATABASE_PATH = dbPath;
  let mod;
  jest.isolateModules(() => {
    mod = require('../server/database');
  });
  return mod;
}

describe('encrypt / decrypt', () => {
  let db;

  beforeAll(() => {
    db = createFreshDb(path.join(os.tmpdir(), `lavapanel-enc-${Date.now()}.db`));
  });

  test('encrypt() produces iv:encrypted format', () => {
    const result = db.encrypt('hello world');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/);
  });

  test('decrypt() reverses encrypt()', () => {
    const original = 'sensitive-data-123!@#';
    const encrypted = db.encrypt(original);
    const decrypted = db.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test('encrypt() produces different outputs for same input', () => {
    const input = 'same value';
    expect(db.encrypt(input)).not.toBe(db.encrypt(input));
  });

  test('decrypt() handles empty string', () => {
    expect(db.decrypt(db.encrypt(''))).toBe('');
  });

  test('decrypt() throws on tampered ciphertext', () => {
    const encrypted = db.encrypt('valid');
    const tampered = encrypted.slice(0, -4) + 'dead';
    expect(() => db.decrypt(tampered)).toThrow();
  });
});

describe('initialize and runMigrations', () => {
  const dbPath = path.join(os.tmpdir(), `lavapanel-init-${Date.now()}.db`);
  let db;

  beforeAll(async () => {
    db = createFreshDb(dbPath);
    await db.initialize();
    await db.runMigrations();
  });

  afterAll(async () => {
    try { await db.close(); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
  });

  test('creates database file', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  test('creates all 8 tables', async () => {
    const rows = await new Promise((resolve, reject) => {
      db.getDb().all(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    const names = rows.map(r => r.name);
    const expected = ['audit_logs', 'backups', 'sessions', 'servers', 'settings', 'themes', 'users', 'webhook_configs'];
    expected.forEach(t => expect(names).toContain(t));
  });

  test('inserts default schema_version', async () => {
    const row = await new Promise((resolve, reject) => {
      db.getDb().get(
        "SELECT value FROM settings WHERE key = 'schema_version'",
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    expect(row.value).toBe('1.0.0');
  });

  test('is idempotent', async () => {
    await expect(db.runMigrations()).resolves.toBeUndefined();
  });

  test('getDb() returns a sqlite3 Database', () => {
    const d = db.getDb();
    expect(typeof d.run).toBe('function');
    expect(typeof d.get).toBe('function');
    expect(typeof d.all).toBe('function');
  });

  test('close() closes the connection', async () => {
    await expect(db.close()).resolves.toBeUndefined();
  });
});

describe('creates parent directory if needed', () => {
  const nestedDir = path.join(os.tmpdir(), 'lavapanel-deep-test', `${Date.now()}`);
  const dbPath = path.join(nestedDir, 'data', 'test.db');
  let db;

  beforeAll(async () => {
    db = createFreshDb(dbPath);
    await db.initialize();
    await db.runMigrations();
  });

  afterAll(async () => {
    try { await db.close(); } catch (e) { /* ignore */ }
    try { fs.rmSync(nestedDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  });

  test('creates nested parent dirs and file', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  test('can write and read in the nested db', async () => {
    await new Promise((resolve, reject) => {
      db.getDb().run(
        "INSERT INTO settings (key, value) VALUES (?, ?)",
        ['nested_test', 'yes'],
        (err) => err ? reject(err) : resolve()
      );
    });

    const row = await new Promise((resolve, reject) => {
      db.getDb().get(
        "SELECT value FROM settings WHERE key = 'nested_test'",
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    expect(row.value).toBe('yes');
  });
});

describe('Integration: full CRUD lifecycle', () => {
  const dbPath = path.join(os.tmpdir(), `lavapanel-crud-${Date.now()}.db`);
  let db;

  beforeAll(async () => {
    db = createFreshDb(dbPath);
    await db.initialize();
    await db.runMigrations();
  });

  afterAll(async () => {
    try { await db.close(); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
  });

  test('insert, read, update, delete a user', async () => {
    // CREATE
    const { lastID } = await new Promise((resolve, reject) => {
      db.getDb().run(
        'INSERT INTO users (username, email, password_hash, coins) VALUES (?, ?, ?, ?)',
        ['cruduser', 'crud@test.com', 'hashed', 100],
        function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID });
        }
      );
    });
    expect(lastID).toBeGreaterThan(0);

    // READ
    const user = await new Promise((resolve, reject) => {
      db.getDb().get(
        'SELECT * FROM users WHERE id = ?', [lastID],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    expect(user.username).toBe('cruduser');
    expect(user.coins).toBe(100);

    // UPDATE
    await new Promise((resolve, reject) => {
      db.getDb().run(
        'UPDATE users SET coins = ? WHERE id = ?', [200, lastID],
        (err) => err ? reject(err) : resolve()
      );
    });

    const updated = await new Promise((resolve, reject) => {
      db.getDb().get('SELECT coins FROM users WHERE id = ?', [lastID],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    expect(updated.coins).toBe(200);

    // DELETE
    await new Promise((resolve, reject) => {
      db.getDb().run('DELETE FROM users WHERE id = ?', [lastID],
        (err) => err ? reject(err) : resolve()
      );
    });

    const gone = await new Promise((resolve, reject) => {
      db.getDb().get('SELECT * FROM users WHERE id = ?', [lastID],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    expect(gone).toBeUndefined();
  });

  test('server referenced to user via foreign key', async () => {
    const { lastID } = await new Promise((resolve, reject) => {
      db.getDb().run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['srvowner', 'srv@test.com', 'pw'],
        function (err) { return err ? reject(err) : resolve({ lastID: this.lastID }); }
      );
    });

    await new Promise((resolve, reject) => {
      db.getDb().run(
        'INSERT INTO servers (id, user_id, name, type, status, config) VALUES (?, ?, ?, ?, ?, ?)',
        ['srv_int_1', lastID, 'Test MC', 'minecraft', 'stopped', '{}'],
        (err) => err ? reject(err) : resolve()
      );
    });

    const row = await new Promise((resolve, reject) => {
      db.getDb().get(
        `SELECT u.username, s.name as sname, s.type
         FROM users u JOIN servers s ON u.id = s.user_id
         WHERE s.id = ?`, ['srv_int_1'],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    expect(row.username).toBe('srvowner');
    expect(row.sname).toBe('Test MC');
    expect(row.type).toBe('minecraft');
  });
});
