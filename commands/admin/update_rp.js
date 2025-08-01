const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update_rp')
    .setDescription('Admin only: Manually adjust a player\'s RP')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose RP to adjust')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The new RP amount')
        .setRequired(true))
    .setDefaultMemberPermissions(0), // Only administrators can use this command

  async execute(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    
    const targetUser = interaction.options.getUser('user');
    const newRp = interaction.options.getInteger('amount');
    
    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('discord_id', targetUser.id)
      .single();
    
    if (playerError && playerError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', playerError);
      return interaction.reply({ content: 'Error fetching player data.', ephemeral: true });
    }
    
    if (!player) {
      return interaction.reply({ content: 'That user is not registered in the system.', ephemeral: true });
    }
    
    // Update player RP
    const { data, error } = await supabase
      .from('players')
      .update({ rp: newRp })
      .eq('id', player.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating RP:', error);
      return interaction.reply({ content: 'Error updating RP. Please try again.', ephemeral: true });
    }
    
    return interaction.reply({ 
      content: `Successfully updated ${targetUser.username}'s RP to ${newRp}.`, 
      ephemeral: true 
    });
  },
};
