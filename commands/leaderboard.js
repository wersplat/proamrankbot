const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

// Simple fuzzy matching function using Levenshtein distance
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple Levenshtein distance calculation
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;
  
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

// Find best matching event using fuzzy matching
async function findEventByName(eventName) {
  const { data: events, error } = await supabase
    .from('events')
    .select('*');
  
  if (error) {
    return { event: null, error };
  }
  
  if (!events || events.length === 0) {
    return { event: null, error: null };
  }
  
  // Calculate similarity scores
  const matches = events.map(event => ({
    event,
    similarity: calculateSimilarity(event.name, eventName)
  }));
  
  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);
  
  // Return best match if similarity is above threshold (0.5)
  if (matches[0].similarity >= 0.5) {
    return { event: matches[0].event, error: null };
  }
  
  return { event: null, error: null };
}

// Get friendly name for a player (Discord display name or username, fallback to gamertag)
async function getFriendlyName(interaction, discordId, gamertag) {
  if (!discordId) {
    return gamertag;
  }
  
  try {
    // Try to fetch guild member first (has displayName/nickname)
    if (interaction.guild) {
      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member) {
        return member.displayName || member.user.username || gamertag;
      }
    }
    
    // Fallback to fetching user directly
    const user = await interaction.client.users.fetch(discordId).catch(() => null);
    if (user) {
      return user.username || gamertag;
    }
  } catch (error) {
    // If fetching fails, fallback to gamertag
    console.error(`Error fetching Discord user ${discordId}:`, error);
  }
  
  return gamertag;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the leaderboard for a specific event')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event name or ID (fuzzy matching supported)')
        .setRequired(true)),

  async execute(interaction) {
    const eventInput = interaction.options.getString('event');
    let event;

    // Try to parse as ID first (numeric or UUID)
    const isNumericId = /^\d+$/.test(eventInput);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventInput);
    
    if (isNumericId || isUuid) {
      // Try exact ID match first
      const { data: eventById, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventInput)
        .single();

      if (!eventError && eventById) {
        event = eventById;
      }
    }

    // If no exact ID match, try fuzzy matching by name
    if (!event) {
      const { event: matchedEvent, error: matchError } = await findEventByName(eventInput);
      if (matchError) {
        console.error('Error fetching events for fuzzy matching:', matchError);
        return interaction.reply({ content: 'Error fetching event data.', ephemeral: true });
      }
      event = matchedEvent;
    }

    if (!event) {
      return interaction.reply({ 
        content: `No event found matching "${eventInput}". Try using the exact event name or ID.`, 
        ephemeral: true 
      });
    }

    // Get event results ordered by score
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select(`
        *,
        players(gamertag, discord_id)
      `)
      .eq('event_id', event.id)
      .order('score', { ascending: false })
      .limit(10);

    if (resultsError) {
      console.error('Error fetching event results:', resultsError);
      return interaction.reply({ content: 'Error fetching event results.', ephemeral: true });
    }

    if (results.length === 0) {
      return interaction.reply({ 
        content: `No results available for ${event.name} yet.`, 
        ephemeral: true 
      });
    }

    // Fetch friendly names for all players
    const friendlyNames = await Promise.all(
      results.map(result => 
        getFriendlyName(
          interaction, 
          result.players?.discord_id, 
          result.players?.gamertag || 'Unknown'
        )
      )
    );

    // Build leaderboard message
    let leaderboard = `**${event.name} Leaderboard**\n\n`;
    
    results.forEach((result, index) => {
      const position = index + 1;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
      const friendlyName = friendlyNames[index];
      leaderboard += `${medal} ${friendlyName} - ${result.score}\n`;
    });

    return interaction.reply({ content: leaderboard, ephemeral: true });
  },
};
