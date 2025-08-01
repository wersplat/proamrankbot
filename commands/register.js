const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register as a player in the Global Rankings system')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Your NBA 2K gamertag')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('platform')
        .setDescription('Your gaming platform')
        .setRequired(true)
        .addChoices(
          { name: 'PlayStation', value: 'playstation' },
          { name: 'Xbox', value: 'xbox' },
          { name: 'Steam', value: 'steam' },
          { name: 'Epic', value: 'epic' }
        ))
    .addStringOption(option =>
      option.setName('position')
        .setDescription('Your primary position')
        .setRequired(true)
        .addChoices(
          { name: 'Point Guard', value: 'PG' },
          { name: 'Shooting Guard', value: 'SG' },
          { name: 'Small Forward', value: 'SF' },
          { name: 'Power Forward', value: 'PF' },
          { name: 'Center', value: 'C' }
        )),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const gamertag = interaction.options.getString('gamertag');
    const platform = interaction.options.getString('platform');
    const position = interaction.options.getString('position');

    // Check if user is already registered
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching player:', fetchError);
      return interaction.reply({ content: 'Error checking registration status.', ephemeral: true });
    }

    if (existingPlayer) {
      return interaction.reply({ content: 'You are already registered in the system!', ephemeral: true });
    }

    // Register new player
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          discord_id: discordId,
          gamertag: gamertag,
          platform: platform,
          position: position,
          rp: 1000, // Default RP
          draft_rating: 50 // Default draft rating
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error registering player:', error);
      return interaction.reply({ content: 'Error registering player. Please try again.', ephemeral: true });
    }

    return interaction.reply({ 
      content: `Successfully registered as ${gamertag} on ${platform}! Your starting RP is 1000.`, 
      ephemeral: true 
    });
  },
};
