const { Events } = require('discord.js');
const supabase = require('../supabase/client');

// In a real implementation, you would require('stripe') here
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === 'payment_event_select') {
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
      
      if (existingRegistration && existingRegistration.stripe_paid) {
        return interaction.update({ 
          content: `You have already paid for ${event.name}!`, 
          components: [] 
        });
      }
      
      // In a real implementation, you would create a Stripe checkout session here
      // For now, we'll simulate the process
      
      /*
      // Example of how to create a Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: event.name,
                description: `${event.type} event entry`,
              },
              unit_amount: event.price * 100, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}&player_id=${player.id}&event_id=${event.id}`,
        cancel_url: `${process.env.DOMAIN}/cancel?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          player_id: player.id,
          event_id: event.id
        }
      });
      */
      
      // For demonstration purposes, we'll just show a message with the payment details
      return interaction.update({ 
        content: `To complete your registration for ${event.name}:\n\nPrice: $${event.price}\n\nIn a real implementation, this would redirect to a Stripe checkout page.`, 
        components: [] 
      });
    }
  },
};
