const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await new Promise((resolve, reject) => {
      db.getDB().get(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        [email, username],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await new Promise((resolve, reject) => {
      db.getDB().run(
        'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
        [email, username, passwordHash],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, username });
        }
      );
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await new Promise((resolve, reject) => {
      db.getDB().get('SELECT * FROM users WHERE email = ?', [email], (err, row) => 
        err ? reject(err) : resolve(row)
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  async (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.redirect(`/?token=${token}&username=${req.user.username}`);
  }
);

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
