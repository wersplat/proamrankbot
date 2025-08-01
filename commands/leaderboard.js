const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the leaderboard for a specific event')
    .addStringOption(option =>
      option.setName('event_id')
        .setDescription('The ID of the event to view the leaderboard for')
        .setRequired(true)),

  async execute(interaction) {
    const eventId = interaction.options.getString('event_id');

    // Get event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError && eventError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching event:', eventError);
      return interaction.reply({ content: 'Error fetching event data.', ephemeral: true });
    }

    if (!event) {
      return interaction.reply({ content: 'No event found with that ID.', ephemeral: true });
    }

    // Get event results ordered by score
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select(`
        *,
        players(gamertag)
      `)
      .eq('event_id', eventId)
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

    // Build leaderboard message
    let leaderboard = `**${event.name} Leaderboard**\n\n`;
    
    results.forEach((result, index) => {
      const position = index + 1;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
      leaderboard += `${medal} ${result.players.gamertag} - ${result.score}\n`;
    });

    return interaction.reply({ content: leaderboard, ephemeral: true });
  },
};
