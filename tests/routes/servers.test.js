const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Generate a valid token for tests
const validToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Mock the database module
const mockDb = { getDB: jest.fn() };
jest.mock('../../server/database', () => mockDb);

// Mock WebSocket to avoid side effects
jest.mock('../../server/websocket', () => ({
  broadcastServerStatus: jest.fn(),
  sendServerLog: jest.fn(),
  sendToUser: jest.fn(),
  sendToServer: jest.fn(),
  broadcastStats: jest.fn()
}));

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    pid: 99999,
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() }
  }))
}));

const serverRoutes = require('../../server/routes/servers');

describe('Server Routes', () => {
  let app;
  let mockDbInstance;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/servers', serverRoutes);
  });

  beforeEach(() => {
    mockDbInstance = {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    };
    mockDb.getDB.mockReturnValue(mockDbInstance);
    jest.clearAllMocks();
  });

  const authHeader = { Authorization: `Bearer ${validToken}` };

  describe('GET /api/servers/', () => {
    test('returns 401 without token', async () => {
      const res = await request(app).get('/api/servers/');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    test('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/servers/')
        .set('Authorization', 'Bearer badtoken');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    test('returns empty array when user has no servers', async () => {
      mockDbInstance.all.mockImplementation((sql, params, cb) => cb(null, []));

      const res = await request(app)
        .get('/api/servers/')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns servers for the authenticated user', async () => {
      const mockServers = [
        { id: 1, user_id: 1, name: 'My Bot', type: 'discord', status: 'running', config: '{}' },
        { id: 2, user_id: 1, name: 'My MC', type: 'minecraft', status: 'stopped', config: '{"ram":"4G"}' }
      ];
      mockDbInstance.all.mockImplementation((sql, params, cb) => cb(null, mockServers));

      const res = await request(app)
        .get('/api/servers/')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('My Bot');
      expect(res.body[1].name).toBe('My MC');
    });

    test('returns 500 on database error', async () => {
      mockDbInstance.all.mockImplementation((sql, params, cb) => cb(new Error('DB fail')));

      const res = await request(app)
        .get('/api/servers/')
        .set(authHeader);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('POST /api/servers/create', () => {
    test('returns 400 without name or type', async () => {
      const res = await request(app)
        .post('/api/servers/create')
        .set(authHeader)
        .send({ name: 'test' }); // missing type

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name and type required');
    });

    test('returns 201 with serverId on success', async () => {
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        cb.call({ lastID: 99 }, null);
      });

      const res = await request(app)
        .post('/api/servers/create')
        .set(authHeader)
        .send({ name: 'New Bot', type: 'discord', config: { token: 'abc' } });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Server created successfully');
      expect(res.body.serverId).toBe(99);
    });

    test('returns 500 on database failure', async () => {
      mockDbInstance.run.mockImplementation((sql, params, cb) => cb(new Error('insert fail')));

      const res = await request(app)
        .post('/api/servers/create')
        .set(authHeader)
        .send({ name: 'Fail', type: 'minecraft' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Server creation failed');
    });
  });

  describe('POST /api/servers/:id/start', () => {
    test('returns 404 for non-existent server', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));

      const res = await request(app)
        .post('/api/servers/999/start')
        .set(authHeader);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Server not found');
    });

    test('returns 200 and starts a discord server', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, user_id: 1, name: 'Bot', type: 'discord', config: '{}', path: '/tmp/srv' });
      });
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        if (typeof cb === 'function') cb(null);
      });

      const res = await request(app)
        .post('/api/servers/1/start')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Server started');
      expect(res.body.pid).toBeDefined();
    });
  });

  describe('POST /api/servers/:id/stop', () => {
    test('returns 404 for non-existent server', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));

      const res = await request(app)
        .post('/api/servers/999/stop')
        .set(authHeader);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Server not found');
    });

    test('returns 200 and stops the server', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, user_id: 1, name: 'Bot', type: 'discord', config: '{}' });
      });
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        if (typeof cb === 'function') cb(null);
      });

      const res = await request(app)
        .post('/api/servers/1/stop')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Server stopped');
    });
  });

  describe('DELETE /api/servers/:id', () => {
    test('returns 404 for non-existent server', async () => {
      // Route now calls get() first to fetch server before delete
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));

      const res = await request(app)
        .delete('/api/servers/999')
        .set(authHeader);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Server not found');
    });

    test('returns 200 on successful deletion', async () => {
      // Route calls get() first to fetch the server record
      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, user_id: 1, name: 'Bot', type: 'discord', config: '{}' });
      });
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        if (typeof cb === 'function') cb(null);
      });

      const res = await request(app)
        .delete('/api/servers/1')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Server deleted successfully');
    });
  });
});
