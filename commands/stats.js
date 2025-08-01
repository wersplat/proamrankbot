const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View detailed player statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose stats to view (leave blank for your own stats)')),

  async execute(interaction) {
    // If no user is specified, use the command issuer
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const discordId = targetUser.id;

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        *,
        teams(name)
      `)
      .eq('discord_id', discordId)
      .single();

    if (playerError && playerError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', playerError);
      return interaction.reply({ content: 'Error fetching player data.', ephemeral: true });
    }

    if (!player) {
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: 'You are not registered in the system. Use /register to sign up!', ephemeral: true });
      } else {
        return interaction.reply({ content: 'That user is not registered in the system.', ephemeral: true });
      }
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

    // Get awards count
    const { count: awardsCount, error: awardsError } = await supabase
      .from('player_awards')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.id);

    if (awardsError) {
      console.error('Error counting awards:', awardsError);
    }

    // Get events participated count
    const { count: eventsCount, error: eventsError } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.id);

    if (eventsError) {
      console.error('Error counting events:', eventsError);
    }

    // Format platform name
    const platformNames = {
      'playstation': 'PlayStation',
      'xbox': 'Xbox',
      'steam': 'Steam',
      'epic': 'Epic'
    };

    const platformName = platformNames[player.platform] || player.platform;

    // Format position name
    const positionNames = {
      'PG': 'Point Guard',
      'SG': 'Shooting Guard',
      'SF': 'Small Forward',
      'PF': 'Power Forward',
      'C': 'Center'
    };

    const positionName = positionNames[player.position] || player.position;

    // Build response
    let response = `**Player Stats for ${targetUser.username}**\n\n`;
    response += `**Gamertag:** ${player.gamertag}\n`;
    response += `**Platform:** ${platformName}\n`;
    response += `**Position:** ${positionName}\n`;
    
    if (player.teams) {
      response += `**Team:** ${player.teams.name}\n`;
    } else {
      response += `**Team:** Free Agent\n`;
    }
    
    response += `\n**Ranking Info:**\n`;
    response += `**RP:** ${player.rp}\n`;
    response += `**Global Rank:** #${globalRank} of ${totalPlayers} (${rankPercentile}th percentile)\n`;
    response += `**Draft Tier:** ${draftTier}\n`;
    response += `**Draft Rating:** ${player.draft_rating}\n`;
    
    response += `\n**Activity:**\n`;
    response += `**Events Participated:** ${eventsCount || 0}\n`;
    response += `**Awards:** ${awardsCount || 0}\n`;

    return interaction.reply({ content: response, ephemeral: true });
  },
};
