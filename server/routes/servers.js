const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

router.get('/', authMiddleware, (req, res) => {
  db.getDB().all(
    'SELECT * FROM servers WHERE user_id = ?',
    [req.userId],
    (err, servers) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(servers);
    }
  );
});

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, type, config } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }

    const serverPath = path.join(__dirname, '../../servers', req.userId.toString(), Date.now().toString());
    fs.mkdirSync(serverPath, { recursive: true });

    const result = await new Promise((resolve, reject) => {
      db.getDB().run(
        'INSERT INTO servers (user_id, name, type, config, path, status) VALUES (?, ?, ?, ?, ?, ?)',
        [req.userId, name, type, JSON.stringify(config), serverPath, 'stopped'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    res.status(201).json({
      message: 'Server created successfully',
      serverId: result.id,
      path: serverPath
    });
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Server creation failed' });
  }
});

router.post('/:id/start', authMiddleware, (req, res) => {
  const serverId = req.params.id;
  
  db.getDB().get(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, req.userId],
    (err, server) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!server) return res.status(404).json({ error: 'Server not found' });

      const config = JSON.parse(server.config);
      let command;

      if (server.type === 'minecraft') {
        command = `java -Xmx${config.ram || '2G'} -jar server.jar nogui`;
      } else if (server.type === 'discord') {
        command = 'node index.js';
      } else {
        return res.status(400).json({ error: 'Unsupported server type' });
      }

      const serverProcess = spawn(command, { cwd: server.path, shell: true });
      
      db.getDB().run(
        'UPDATE servers SET status = ? WHERE id = ?',
        ['running', serverId]
      );

      res.json({ message: 'Server started', pid: serverProcess.pid });
    }
  );
});

router.post('/:id/stop', authMiddleware, (req, res) => {
  const serverId = req.params.id;
  
  db.getDB().get(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, req.userId],
    (err, server) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!server) return res.status(404).json({ error: 'Server not found' });

      db.getDB().run(
        'UPDATE servers SET status = ? WHERE id = ?',
        ['stopped', serverId]
      );

      res.json({ message: 'Server stopped' });
    }
  );
});

router.delete('/:id', authMiddleware, (req, res) => {
  const serverId = req.params.id;
  
  db.getDB().run(
    'DELETE FROM servers WHERE id = ? AND user_id = ?',
    [serverId, req.userId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Server not found' });
      
      res.json({ message: 'Server deleted successfully' });
    }
  );
});

module.exports = router;
