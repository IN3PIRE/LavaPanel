const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', (req, res) => {
  const stats = {};
  
  db.getDB().get('SELECT COUNT(*) as count FROM users', (err, result) => {
    stats.users = result.count;
    
    db.getDB().get('SELECT COUNT(*) as count FROM servers', (err, result) => {
      stats.servers = result.count;
      db.getDB().get('SELECT COUNT(*) as count FROM servers WHERE status = "running"', (err, result) => {
        stats.runningServers = result.count;
        res.json(stats);
      });
    });
  });
});

router.get('/version', (req, res) => {
  res.json({ version: '1.0.0', phase: 'Phase 2 Complete' });
});

module.exports = router;
