import { Client, GatewayIntentBits, Message, Attachment } from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Type definitions
interface UploadData {
  server_id: string;
  channel_id: string;
  message_id: string;
  uploaded_by: string;
  image_url: string;
  filename: string;
}

// Environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BOT_SECRET = process.env.BOT_SECRET;
const UPLOAD_ENDPOINT = process.env.UPLOAD_ENDPOINT;

// Whitelisted channels
const WHITELISTED_CHANNELS: string[] = ['123', '456'];

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handlers
client.on('ready', () => {
  console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check if channel is whitelisted
  if (!WHITELISTED_CHANNELS.includes(message.channelId)) return;

  // Process each attachment
  for (const attachment of message.attachments.values()) {
    if (attachment.contentType?.startsWith('image/')) {
      try {
        // Extract required data
        const uploadData: UploadData = {
          server_id: message.guildId ?? '',
          channel_id: message.channelId,
          message_id: message.id,
          uploaded_by: message.author.id,
          image_url: attachment.url,
          filename: attachment.name,
        };

        // Send to backend
        const response = await axios.post(UPLOAD_ENDPOINT!, uploadData, {
          headers: {
            'Authorization': `BotSecret ${BOT_SECRET}`,
          },
        });

        console.log(`Successfully uploaded image: ${attachment.name}`);
      } catch (error) {
        console.error(`Failed to upload image ${attachment.name}:`, error);
      }
    }
  }
});

// Login to Discord
client.login(DISCORD_TOKEN!);
