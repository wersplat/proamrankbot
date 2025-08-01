const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myrank')
    .setDescription('Check your current RP, global rank, and draft tier'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (playerError && playerError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', playerError);
      return interaction.reply({ content: 'Error fetching player data.', ephemeral: true });
    }

    if (!player) {
      return interaction.reply({ content: 'You are not registered in the system. Use /register to sign up!', ephemeral: true });
    }

    // Get player's global rank
    const { count: totalPlayers, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting players:', countError);
      return interaction.reply({ content: 'Error fetching ranking data.', ephemeral: true });
    }

    // Get players with higher RP to determine rank
    const { count: higherRankedPlayers, error: rankError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .gt('rp', player.rp);

    if (rankError) {
      console.error('Error calculating rank:', rankError);
      return interaction.reply({ content: 'Error calculating rank.', ephemeral: true });
    }

    const globalRank = higherRankedPlayers + 1;
    const rankPercentile = ((totalPlayers - globalRank + 1) / totalPlayers * 100).toFixed(1);

    // Determine draft tier based on RP
    let draftTier;
    if (player.rp >= 1500) {
      draftTier = 'S-Tier';
    } else if (player.rp >= 1300) {
      draftTier = 'A-Tier';
    } else if (player.rp >= 1100) {
      draftTier = 'B-Tier';
    } else if (player.rp >= 900) {
      draftTier = 'C-Tier';
    } else {
      draftTier = 'D-Tier';
    }

    return interaction.reply({ 
      content: `**Your Rank Details:**\n\n**Gamertag:** ${player.gamertag}\n**RP:** ${player.rp}\n**Global Rank:** #${globalRank} of ${totalPlayers} (${rankPercentile}th percentile)\n**Draft Tier:** ${draftTier}\n**Draft Rating:** ${player.draft_rating}`, 
      ephemeral: true 
    });
  },
};
