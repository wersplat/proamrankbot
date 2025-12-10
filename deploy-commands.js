require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // optional: if set, registers guild commands (fast)

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in env.');
  process.exit(1);
}

function collectCommands(dir) {
  const commands = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      commands.push(...collectCommands(fullPath));
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const command = require(fullPath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[deploy-commands] Skipping ${fullPath} (missing data/execute).`);
    }
  }
  return commands;
}

const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  try {
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    const newCommands = collectCommands(path.join(__dirname, 'commands'));
    console.log(`Collected ${newCommands.length} commands from files; fetching existing to preserve entry-point commands...`);

    // Fetch existing commands to keep the mandatory entry point command
    const existing = await rest.get(route);
    console.log(`Existing commands: ${existing.length}`);

    const mergedByName = new Map();

    // Keep existing first (to preserve entry point / special commands)
    for (const cmd of existing) {
      mergedByName.set(cmd.name, cmd);
    }

    // Override with new definitions where we have them
    for (const cmd of newCommands) {
      mergedByName.set(cmd.name, cmd);
    }

    const finalCommands = Array.from(mergedByName.values());

    console.log(`Refreshing ${finalCommands.length} application commands...`);
    const data = await rest.put(route, { body: finalCommands });
    console.log(`Successfully reloaded ${data.length} commands${guildId ? ` for guild ${guildId}` : ''}.`);
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

main();

