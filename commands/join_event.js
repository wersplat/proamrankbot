const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join_event')
    .setDescription('Join an open event'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    // Check if user is registered
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (playerError && playerError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', playerError);
      return interaction.reply({ content: 'Error checking registration status.', ephemeral: true });
    }

    if (!player) {
      return interaction.reply({ content: 'You are not registered in the system. Use /register to sign up!', ephemeral: true });
    }

    // Get open events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('open_status', true);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return interaction.reply({ content: 'Error fetching events.', ephemeral: true });
    }

    if (events.length === 0) {
      return interaction.reply({ content: 'No events are currently open for registration.', ephemeral: true });
    }

    // Create select menu for events
    const eventOptions = events.map(event => ({
      label: event.name,
      description: `${event.type} event`,
      value: event.id.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('event_select')
      .setPlaceholder('Select an event to join')
      .addOptions(eventOptions);

    const row = new ActionRowBuilder()
      .addComponents(selectMenu);

    return interaction.reply({ 
      content: 'Select an event to join:', 
      components: [row], 
      ephemeral: true 
    });
  },
};
