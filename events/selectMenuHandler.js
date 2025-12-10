const { Events } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === 'event_select' || interaction.customId === 'payment_event_select') {
      return interaction.update({
        content: 'Event registration is currently disabled.',
        components: []
      });
    }
  },
};
