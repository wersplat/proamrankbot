const supabase = require('../supabase/client');
const { getDraftTier, getRoleForTier, getTeamRole, getEventRole } = require('./rankUtils');

/**
 * Update Discord roles for all players based on their current status
 * This function should be run as a daily cron job
 */
async function updateAllPlayerRoles() {
  console.log('Starting role automation update...');
  
  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*');
  
  if (playersError) {
    console.error('Error fetching players:', playersError);
    return;
  }
  
  console.log(`Processing ${players.length} players...`);
  
  // Process each player
  for (const player of players) {
    if (!player.discord_id) {
      // Skip players not linked to Discord
      continue;
    }
    
    try {
      await updatePlayerRoles(player);
    } catch (error) {
      console.error(`Error updating roles for player ${player.id}:`, error);
    }
  }
  
  console.log('Role automation update complete.');
}

/**
 * Update Discord roles for a specific player
 * @param {object} player - Player object
 */
async function updatePlayerRoles(player) {
  // In a real implementation, you would use the Discord.js client to update roles
  // For now, we'll just log what roles should be assigned
  
  // Get player's draft tier role
  const tier = getDraftTier(player.rp);
  const tierRole = getRoleForTier(tier);
  
  // Get player's team role
  let teamRole = 'Free Agent';
  if (player.team_id) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', player.team_id)
      .single();
    
    if (!teamError) {
      teamRole = team.name;
    }
  }
  
  // Event roles are currently disabled (registration and draft pool removed)
  const eventRole = getEventRole();
  
  console.log(`Player ${player.gamertag} (${player.discord_id}) should have roles:`, {
    tierRole,
    teamRole,
    eventRole
  });
  
  // In a real implementation, you would update the Discord roles here
  // Example:
  // const guild = client.guilds.cache.get('GUILD_ID');
  // const member = await guild.members.fetch(player.discord_id);
  // 
  // // Remove old roles
  // // Add new roles
  // await member.roles.add([tierRole, teamRole, eventRole]);
}

/**
 * Update roles for a single player by Discord ID
 * @param {string} discordId - Discord user ID
 */
async function updateRolesForPlayer(discordId) {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('discord_id', discordId)
    .single();
  
  if (playerError) {
    console.error('Error fetching player:', playerError);
    return;
  }
  
  if (!player) {
    console.log(`No player found for Discord ID ${discordId}`);
    return;
  }
  
  await updatePlayerRoles(player);
}

module.exports = {
  updateAllPlayerRoles,
  updateRolesForPlayer
};
