const request = require('supertest');
const express = require('express');

const mockDb = { getDB: jest.fn() };
jest.mock('../../server/database', () => mockDb);

const themeRoutes = require('../../server/routes/themes');

describe('Theme Routes', () => {
  let app;
  let mockDbInstance;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/themes', themeRoutes);
  });

  beforeEach(() => {
    mockDbInstance = {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn(),
      serialize: jest.fn(cb => cb())
    };
    mockDb.getDB.mockReturnValue(mockDbInstance);
    jest.clearAllMocks();
  });

  describe('GET /api/themes/', () => {
    test('returns all themes', async () => {
      const rawThemes = [
        { id: 1, name: 'lava', author: 'IN3PIRE', config: '{"primary":"#ff4400"}', is_active: 1 },
        { id: 2, name: 'forest', author: 'IN3PIRE', config: '{"primary":"#228B22"}', is_active: 0 }
      ];
      mockDbInstance.all.mockImplementation((sql, cb) => cb(null, rawThemes));

      const res = await request(app).get('/api/themes/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('lava');
      expect(res.body[0].isActive).toBe(true);
      expect(res.body[0].config.primary).toBe('#ff4400');
      expect(res.body[1].name).toBe('forest');
      expect(res.body[1].isActive).toBe(false);
    });

    test('returns 500 on database error', async () => {
      mockDbInstance.all.mockImplementation((sql, cb) => cb(new Error('DB fail')));

      const res = await request(app).get('/api/themes/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/themes/active', () => {
    test('returns the active theme', async () => {
      const activeTheme = { id: 1, name: 'lava', config: '{"primary":"#ff4400"}', is_active: 1 };
      mockDbInstance.get.mockImplementation((sql, cb) => cb(null, activeTheme));

      const res = await request(app).get('/api/themes/active');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('lava');
      expect(res.body.config.primary).toBe('#ff4400');
    });

    test('returns null when no theme is active', async () => {
      mockDbInstance.get.mockImplementation((sql, cb) => cb(null, null));

      const res = await request(app).get('/api/themes/active');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('POST /api/themes/activate/:id', () => {
    test('activates a theme successfully', async () => {
      let callCount = 0;
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        callCount++;
        // 1st call: deactivate all (no cb), 2nd call: activate specific
        if (callCount === 2 && typeof cb === 'function') cb(null);
      });

      const res = await request(app).post('/api/themes/activate/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Theme activated');
    });

    test('returns 500 on failure', async () => {
      let callCount = 0;
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        callCount++;
        if (callCount === 2 && typeof cb === 'function') cb(new Error('update fail'));
      });

      const res = await request(app).post('/api/themes/activate/999');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to activate theme');
    });
  });
});
