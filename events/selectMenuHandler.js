const { Events } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === 'event_select') {
      const eventId = interaction.values[0];
      const discordId = interaction.user.id;
      
      // Get player data
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('discord_id', discordId)
        .single();
      
      if (playerError) {
        console.error('Error fetching player:', playerError);
        return interaction.update({ content: 'Error fetching player data.', components: [] });
      }
      
      // Get event data
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        console.error('Error fetching event:', eventError);
        return interaction.update({ content: 'Error fetching event data.', components: [] });
      }
      
      // Check if player is already registered for this event
      const { data: existingRegistration, error: registrationError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('player_id', player.id)
        .eq('event_id', eventId)
        .single();
      
      if (existingRegistration) {
        return interaction.update({ 
          content: `You are already registered for ${event.name}!`, 
          components: [] 
        });
      }
      
      // Register player for event
      // For draft events, add to draft pool
      // For BYOT events, add to event registrations
      
      let registrationResult;
      
      if (event.type === 'draft') {
        // Add to draft pool
        registrationResult = await supabase
          .from('draft_pool')
          .insert([
            {
              player_id: player.id,
              event_id: eventId,
              status: 'available'
            }
          ]);
      } else {
        // Add to event registrations
        registrationResult = await supabase
          .from('event_registrations')
          .insert([
            {
              player_id: player.id,
              event_id: eventId
            }
          ]);
      }
      
      if (registrationResult.error) {
        console.error('Error registering for event:', registrationResult.error);
        return interaction.update({ 
          content: `Error registering for ${event.name}. Please try again.`, 
          components: [] 
        });
      }
      
      return interaction.update({ 
        content: `Successfully registered for ${event.name}!`, 
        components: [] 
      });
    }
  },
};
