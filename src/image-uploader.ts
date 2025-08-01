import { Client, GatewayIntentBits, Message, Attachment } from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Constants
const WHITELISTED_CHANNELS: string[] = ['123', '456']; // Replace with actual channel IDs

// Type for the image upload request body
interface ImageUploadRequest {
    server_id: string;
    channel_id: string;
    message_id: string;
    uploaded_by: string;
    image_url: string;
    filename: string;
}

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
    console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
    // Ignore bot messages and messages not in whitelisted channels
    if (message.author.bot || !WHITELISTED_CHANNELS.includes(message.channelId)) {
        return;
    }

    // Process each attachment
    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image/')) {
            try {
                // Extract metadata
                const uploadData: ImageUploadRequest = {
                    server_id: message.guildId!,
                    channel_id: message.channelId,
                    message_id: message.id,
                    uploaded_by: message.author.id,
                    image_url: attachment.url,
                    filename: attachment.name,
                };

                // Send to backend
                await axios.post(process.env.UPLOAD_ENDPOINT!, uploadData, {
                    headers: {
                        Authorization: `BotSecret ${process.env.BOT_SECRET}`,
                    },
                });

                console.log(`Successfully uploaded image from message ${message.id}`);
            } catch (error) {
                console.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
