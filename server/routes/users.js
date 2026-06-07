const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/profile', authMiddleware, (req, res) => {
  db.getDB().get(
    'SELECT id, email, username, avatar_url, coins, created_at FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
});

router.get('/coins', authMiddleware, (req, res) => {
  db.getDB().get(
    'SELECT coins FROM users WHERE id = ?',
    [req.userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ coins: result.coins });
    }
  );
});

router.post('/coins/add', authMiddleware, (req, res) => {
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  db.getDB().run(
    'UPDATE users SET coins = coins + ? WHERE id = ?',
    [amount, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: `Added ${amount} coins` });
    }
  );
});

module.exports = router;
