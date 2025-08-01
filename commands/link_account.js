const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link_account')
    .setDescription('Link your existing player account to your Discord user')
    .addStringOption(option =>
      option.setName('player_id')
        .setDescription('Your existing player ID from external events')
        .setRequired(true)),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const playerId = interaction.options.getString('player_id');

    // Check if the player ID exists in the database
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', fetchError);
      return interaction.reply({ content: 'Error finding player account.', ephemeral: true });
    }

    if (!existingPlayer) {
      return interaction.reply({ content: 'No player found with that ID. Please check your ID and try again.', ephemeral: true });
    }

    // Check if the player is already linked to a Discord account
    if (existingPlayer.discord_id) {
      if (existingPlayer.discord_id === discordId) {
        return interaction.reply({ content: 'This account is already linked to your Discord user!', ephemeral: true });
      } else {
        return interaction.reply({ content: 'This player account is already linked to another Discord user.', ephemeral: true });
      }
    }

    // Link the player account to the Discord user
    const { data, error } = await supabase
      .from('players')
      .update({ discord_id: discordId })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error linking player account:', error);
      return interaction.reply({ content: 'Error linking player account. Please try again.', ephemeral: true });
    }

    return interaction.reply({ 
      content: `Successfully linked account ${data.gamertag} to your Discord user!`, 
      ephemeral: true 
    });
  },
};
