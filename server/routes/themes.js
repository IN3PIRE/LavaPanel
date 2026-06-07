const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.getDB().all('SELECT * FROM themes', (err, themes) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const formattedThemes = themes.map(theme => ({
      id: theme.id,
      name: theme.name,
      author: theme.author,
      config: JSON.parse(theme.config),
      isActive: theme.is_active === 1
    }));
    
    res.json(formattedThemes);
  });
});

router.get('/active', (req, res) => {
  db.getDB().get(
    'SELECT * FROM themes WHERE is_active = 1',
    (err, theme) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(theme ? { ...theme, config: JSON.parse(theme.config) } : null);
    }
  );
});

router.post('/activate/:id', (req, res) => {
  db.getDB().serialize(() => {
    db.getDB().run('UPDATE themes SET is_active = 0 WHERE is_active = 1');
    db.getDB().run(
      'UPDATE themes SET is_active = 1 WHERE id = ?',
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to activate theme' });
        res.json({ message: 'Theme activated' });
      }
    );
  });
});

module.exports = router;
