const TelegramBot = require('node-telegram-bot-api');
const db = require('../database');

let telegramBot;

const startTelegramBot = () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('⚠️  Telegram bot not configured (missing TELEGRAM_BOT_TOKEN)');
    return;
  }

  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
      bot.sendMessage(
        chatId,
        `🔥 Welcome to LavaPanel!
\n🌋 Manage your Discord bots and Minecraft servers easily.
\nCommands:
/status - Check your server status
/coins - View your coin balance
/help - Get help
\nLink your account: /link <email>`
      );
    }

    if (text === '/status') {
      db.getDB().get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [chatId.toString()],
        (err, user) => {
          if (!user) {
            return bot.sendMessage(chatId, '❌ Account not linked. Use /link <email> first.');
          }

          db.getDB().all(
            'SELECT * FROM servers WHERE user_id = ?',
            [user.id],
            (err, servers) => {
              if (servers.length === 0) {
                return bot.sendMessage(chatId, '📭 You have no servers.');
              }

              const status = servers.map(s => `• ${s.name} (${s.type}): ${s.status}`).join('\n');
              bot.sendMessage(chatId, `🖥️ Your servers:\n\n${status}`);
            }
          );
        }
      );
    }

    if (text === '/coins') {
      db.getDB().get(
        'SELECT coins FROM users WHERE telegram_id = ?',
        [chatId.toString()],
        (err, result) => {
          if (result) {
            bot.sendMessage(chatId, `💰 You have ${result.coins} coins`);
          } else {
            bot.sendMessage(chatId, '❌ Account not linked. Use /link <email> first.');
          }
        }
      );
    }

    if (text === '/help') {
      bot.sendMessage(
        chatId,
        `📖 LavaPanel Help
\n🔗 Link account: /link <email>
📊 Check servers: /status
💰 Check coins: /coins
❓ This help: /help
\nNeed more help? Contact support!`
      );
    }

    if (text?.startsWith('/link ')) {
      const email = text.split(' ')[1];
      
      if (!email) {
        return bot.sendMessage(chatId, '❌ Usage: /link <email>');
      }

      db.getDB().get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, user) => {
          if (!user) {
            return bot.sendMessage(chatId, '❌ No account found with that email.');
          }

          db.getDB().run(
            'UPDATE users SET telegram_id = ? WHERE email = ?',
            [chatId.toString(), email],
            (err) => {
              if (err) {
                bot.sendMessage(chatId, '❌ Failed to link account.');
              } else {
                bot.sendMessage(chatId, '✅ Successfully linked your Telegram account!');
              }
            }
          );
        }
      );
    }
  });

  console.log('✅ Telegram bot started');
  telegramBot = bot;
};

const getTelegramBot = () => telegramBot;

module.exports = { startTelegramBot, getTelegramBot };
