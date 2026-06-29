const request = require('supertest');
const express = require('express');

const mockDb = { getDB: jest.fn() };
jest.mock('../../server/database', () => mockDb);

const apiRoutes = require('../../server/routes/api');

describe('API Routes', () => {
  let app;
  let mockDbInstance;

  beforeAll(() => {
    app = express();
    app.use('/api', apiRoutes);
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

  describe('GET /api/health', () => {
    test('returns ok status with timestamp', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
    });
  });

  describe('GET /api/version', () => {
    test('returns version and phase info', async () => {
      const res = await request(app).get('/api/version');

      expect(res.status).toBe(200);
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.phase).toBe('Phase 2 Complete');
    });
  });

  describe('GET /api/stats', () => {
    test('returns aggregated stats', async () => {
      // Three sequential queries: users count, servers count, running count
      let callCount = 0;
      mockDbInstance.get.mockImplementation((sql, cb) => {
        callCount++;
        if (callCount === 1) cb(null, { count: 10 });
        else if (callCount === 2) cb(null, { count: 5 });
        else if (callCount === 3) cb(null, { count: 3 });
      });

      const res = await request(app).get('/api/stats');

      expect(res.status).toBe(200);
      expect(res.body.users).toBe(10);
      expect(res.body.servers).toBe(5);
      expect(res.body.runningServers).toBe(3);
    });

    test('handles database error gracefully', async () => {
      mockDbInstance.get.mockImplementation((sql, cb) => cb(new Error('DB fail')));

      const res = await request(app).get('/api/stats');

      // Nested callbacks throw uncaught errors → Express returns 500
      expect(res.status).toBe(500);
    });
  });
});
