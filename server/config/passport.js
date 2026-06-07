const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('../database');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.getDB().get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
  const userData = {
    discord_id: profile.id,
    username: profile.username,
    email: profile.email,
    avatar_url: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null
  };

  db.getDB().get('SELECT * FROM users WHERE discord_id = ?', [profile.id], (err, existingUser) => {
    if (err) return done(err);
    
    if (existingUser) {
      db.getDB().run(
        'UPDATE users SET username = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
        [userData.username, userData.avatar_url, profile.id],
        (err) => done(err, existingUser)
      );
    } else {
      db.getDB().run(
        'INSERT INTO users (discord_id, username, email, avatar_url) VALUES (?, ?, ?, ?)',
        [userData.discord_id, userData.username, userData.email, userData.avatar_url],
        function(err) {
          if (err) return done(err);
          done(null, { id: this.lastID, ...userData });
        }
      );
    }
  });
}));

module.exports = passport;
