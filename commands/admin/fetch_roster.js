const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fetch_roster')
    .setDescription('Admin only: Fetch a team\'s roster')
    .addStringOption(option =>
      option.setName('team_id')
        .setDescription('The ID of the team')
        .setRequired(true))
    .setDefaultMemberPermissions(0), // Only administrators can use this command

  async execute(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    
    const teamId = interaction.options.getString('team_id');
    
    // Get team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (teamError && teamError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching team:', teamError);
      return interaction.reply({ content: 'Error fetching team data.', ephemeral: true });
    }
    
    if (!team) {
      return interaction.reply({ content: 'No team found with that ID.', ephemeral: true });
    }
    
    // Get team roster
    const { data: roster, error: rosterError } = await supabase
      .from('team_rosters')
      .select(`
        *,
        players(gamertag, position, rp)
      `)
      .eq('team_id', teamId);
    
    if (rosterError) {
      console.error('Error fetching roster:', rosterError);
      return interaction.reply({ content: 'Error fetching roster data.', ephemeral: true });
    }
    
    if (roster.length === 0) {
      return interaction.reply({ 
        content: `${team.name} has no players on their roster.`, 
        ephemeral: true 
      });
    }
    
    // Build roster message
    let rosterMessage = `**${team.name} Roster**\n\n`;
    
    roster.forEach((entry, index) => {
      const player = entry.players;
      rosterMessage += `${index + 1}. ${player.gamertag} (${player.position}) - RP: ${player.rp}\n`;
    });
    
    return interaction.reply({ content: rosterMessage, ephemeral: true });
  },
};
