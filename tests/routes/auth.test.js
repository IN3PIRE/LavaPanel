const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the database module before requiring the routes
const mockDb = {
  getDB: jest.fn()
};
jest.mock('../../server/database', () => mockDb);

const authRoutes = require('../../server/routes/auth');

describe('Auth Routes', () => {
  let app;
  let mockDbInstance;

  beforeAll(() => {
    const session = require('express-session');
    const passport = require('passport');
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-session', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    // Create a fresh mock DB instance for each test
    mockDbInstance = {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    };
    mockDb.getDB.mockReturnValue(mockDbInstance);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('returns 400 when fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'only@email.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('All fields are required');
    });

    test('returns 409 when email already exists', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, email: 'existing@test.com', username: 'existing' });
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@test.com', username: 'newguy', password: 'Password123!' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email or username already exists');
    });

    test('returns 201 on successful registration', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));
      mockDbInstance.run.mockImplementation((sql, params, cb) => {
        cb.call({ lastID: 42 }, null);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', username: 'newuser', password: 'StrongPass1!' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
    });

    test('returns 500 on database error', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));
      mockDbInstance.run.mockImplementation((sql, params, cb) => cb(new Error('DB crash')));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'fail@test.com', username: 'failuser', password: 'Pass1234!' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Server error');
    });
  });

  describe('POST /api/auth/login', () => {
    test('returns 400 when email or password missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password required');
    });

    test('returns 401 for non-existent user', async () => {
      mockDbInstance.get.mockImplementation((sql, params, cb) => cb(null, null));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'anypass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('returns 401 for wrong password', async () => {
      const bcrypt = require('bcryptjs');
      const wrongHash = bcrypt.hashSync('realpassword', 10);

      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, email: 'test@test.com', username: 'tester', password_hash: wrongHash });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('returns 200 with token on successful login', async () => {
      const bcrypt = require('bcryptjs');
      const correctHash = bcrypt.hashSync('CorrectPass1!', 10);

      mockDbInstance.get.mockImplementation((sql, params, cb) => {
        cb(null, { id: 1, email: 'test@test.com', username: 'tester', password_hash: correctHash });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'CorrectPass1!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(1);
      expect(res.body.user.email).toBe('test@test.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('returns 200 on logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
