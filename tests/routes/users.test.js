const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const validToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

const mockDb = { getDB: jest.fn() };
jest.mock('../../server/database', () => mockDb);

const userRoutes = require('../../server/routes/users');

describe('User Routes', () => {
  let app;
  let mockDbInstance;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
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

  describe('GET /api/users/profile', () => {
    test('returns 401 without token', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });

    test('returns user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        username: 'tester',
        avatar_url: null,
        coins: 50,
        created_at: '2025-01-01'
      };
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, mockUser));

      const res = await request(app)
        .get('/api/users/profile')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockUser);
    });

    test('returns 404 when user not found', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));

      const res = await request(app)
        .get('/api/users/profile')
        .set(authHeader);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('GET /api/users/coins', () => {
    test('returns coin balance', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, { coins: 100 }));

      const res = await request(app)
        .get('/api/users/coins')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.coins).toBe(100);
    });
  });

  describe('POST /api/users/coins/add', () => {
    test('returns 400 with invalid amount', async () => {
      const res = await request(app)
        .post('/api/users/coins/add')
        .set(authHeader)
        .send({ amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid amount');
    });

    test('adds coins successfully', async () => {
      mockDbInstance.run.mockImplementation((sql, params, cb) => cb(null));

      const res = await request(app)
        .post('/api/users/coins/add')
        .set(authHeader)
        .send({ amount: 50 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Added 50 coins');
    });
  });
});
