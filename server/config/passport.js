const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../database');

const SCOPES = ['identify', 'email', 'guilds'];

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const dbInstance = db.getDb();
  dbInstance.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return done(err);
    done(null, row || null);
  });
});

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/api/auth/discord/callback',
    scope: SCOPES
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const dbInstance = db.getDb();
      
      dbInstance.get('SELECT * FROM users WHERE discord_id = ?', [profile.id], async (err, existingUser) => {
        if (err) return done(err);
        
        if (existingUser) {
          dbInstance.run(
            'UPDATE users SET discord_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null, existingUser.id]
          );
          return done(null, existingUser);
        }
        
        const email = profile.email || null;
        
        dbInstance.get('SELECT * FROM users WHERE email = ?', [email], (err, emailUser) => {
          if (err) return done(err);
          
          if (emailUser) {
            dbInstance.run(
              'UPDATE users SET discord_id = ?, discord_avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [profile.id, profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null, emailUser.id]
            );
            return done(null, emailUser);
          }
          
          const username = profile.username + '#' + profile.discriminator;
          const avatarUrl = profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null;
          
          dbInstance.run(
            `INSERT INTO users (username, email, discord_id, discord_avatar, coins) VALUES (?, ?, ?, ?, 50)`,
            [username, email, profile.id, avatarUrl],
            function (err) {
              if (err) return done(err);
              
              dbInstance.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                if (err) return done(err);
                
                dbInstance.run(
                  `INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)`,
                  [newUser.id, 'register', 'user', 'Registered via Discord OAuth']
                );
                
                done(null, newUser);
              });
            }
          );
        });
      });
    } catch (err) {
      done(err);
    }
  }));
} else {
  console.warn('⚠️  Discord OAuth not configured — set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET');
}

module.exports = passport;
