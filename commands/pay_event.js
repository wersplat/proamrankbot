const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const supabase = require('../supabase/client');

// In a real implementation, you would require('stripe') here
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay_event')
    .setDescription('Pay for event entry with Stripe'),

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

    // Get events that require payment
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('open_status', true)
      .eq('requires_payment', true);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return interaction.reply({ content: 'Error fetching events.', ephemeral: true });
    }

    if (events.length === 0) {
      return interaction.reply({ content: 'No events requiring payment are currently open for registration.', ephemeral: true });
    }

    // Create select menu for events
    const eventOptions = events.map(event => ({
      label: event.name,
      description: `${event.type} event - $${event.price}`,
      value: event.id.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('payment_event_select')
      .setPlaceholder('Select an event to pay for')
      .addOptions(eventOptions);

    const row = new ActionRowBuilder()
      .addComponents(selectMenu);

    return interaction.reply({ 
      content: 'Select an event to pay for:', 
      components: [row], 
      ephemeral: true 
    });
  },
};
