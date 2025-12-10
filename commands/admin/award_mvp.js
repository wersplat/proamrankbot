const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('award_mvp')
    .setDescription('Admin only: Award MVP to a player in an event')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to award MVP to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('event_id')
        .setDescription('The ID of the event')
        .setRequired(true))
    .setDefaultMemberPermissions(0), // Only administrators can use this command

  async execute(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    
    const targetUser = interaction.options.getUser('user');
    const eventId = interaction.options.getString('event_id');
    
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
    
    // Check if event exists
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
    
    // Participation checks are disabled (event registrations/draft pool removed)
    
    // Check if player already has MVP award for this event
    const { data: existingAward, error: awardError } = await supabase
      .from('player_awards')
      .select('*')
      .eq('player_id', player.id)
      .eq('event_id', eventId)
      .eq('award_type', 'MVP')
      .single();
    
    if (existingAward) {
      return interaction.reply({ content: 'This player already has the MVP award for this event.', ephemeral: true });
    }
    
    // Award MVP
    const { data, error } = await supabase
      .from('player_awards')
      .insert([
        {
          player_id: player.id,
          event_id: eventId,
          award_type: 'MVP'
        }
      ]);
    
    if (error) {
      console.error('Error awarding MVP:', error);
      return interaction.reply({ content: 'Error awarding MVP. Please try again.', ephemeral: true });
    }
    
    // Increase player RP as reward
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ rp: player.rp + 50 })
      .eq('id', player.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating RP:', updateError);
      // Don't fail the command if RP update fails, just log it
    }
    
    return interaction.reply({ 
      content: `Successfully awarded MVP to ${targetUser.username} for ${event.name}! They received a 50 RP bonus.`, 
      ephemeral: true 
    });
  },
};
