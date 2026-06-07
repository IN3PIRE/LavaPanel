const Discord = require('discord.js');
const db = require('../database');

let discordClient;

const startDiscordBot = () => {
  if (!process.env.DISCORD_CLIENT_ID) {
    console.log('⚠️  Discord bot not configured (missing DISCORD_CLIENT_ID)');
    return;
  }

  const client = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.MessageContent
    ]
  });

  client.once('ready', () => {
    console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
      const email = interaction.options.getString('email');
      
      try {
        await new Promise((resolve, reject) => {
          db.getDB().run(
            'UPDATE users SET discord_id = ? WHERE email = ?',
            [interaction.user.id, email],
            function(err) {
              if (err) reject(err);
              else resolve(this.changes > 0);
            }
          );
        });

        interaction.reply('✅ Successfully linked your Discord account!');
      } catch (error) {
        interaction.reply('❌ Failed to link account. Make sure the email is registered.');
      }
    }

    if (interaction.commandName === 'coins') {
      db.getDB().get(
        'SELECT coins FROM users WHERE discord_id = ?',
        [interaction.user.id],
        (err, result) => {
          if (result) {
            interaction.reply(`💰 You have ${result.coins} coins`);
          } else {
            interaction.reply('❌ Account not found. Use /register first.');
          }
        }
      );
    }

    if (interaction.commandName === 'giveaway') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply('❌ Only administrators can create giveaways');
      }

      const duration = interaction.options.getInteger('duration-minutes');
      const prize = interaction.options.getString('prize');

      interaction.reply(`🎉 Giveaway started! Prize: **${prize}** | Duration: ${duration} minutes`);
      
      setTimeout(async () => {
        const channel = await client.channels.fetch(interaction.channelId);
        const messages = await channel.messages.fetch({ limit: 1 });
        const giveawayMessage = messages.first();
        
        const reactions = giveawayMessage.reactions.cache;
        const participants = [];

        reactions.forEach((reaction) => {
          if (reaction.emoji.name === '🎉') {
            reaction.users.cache.forEach(user => {
              if (!user.bot) participants.push(user);
            });
          }
        });

        if (participants.length > 0) {
          const winner = participants[Math.floor(Math.random() * participants.length)];
          channel.send(`🏆 Winner of **${prize}**: ${winner}!`);
          
          db.getDB().run(
            'UPDATE users SET coins = coins + ? WHERE discord_id = ?',
            [100, winner.id]
          );
        } else {
          channel.send('❌ No participants in the giveaway.');
        }
      }, duration * 60 * 1000);
    }
  });

  client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.log('⚠️  Discord bot login failed (invalid token or not configured)');
  });

  discordClient = client;
};

const getDiscordClient = () => discordClient;

module.exports = { startDiscordBot, getDiscordClient };
