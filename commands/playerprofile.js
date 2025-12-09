const { SlashCommandBuilder } = require('discord.js');
const { getPlayerProfile } = require('../utils/playerProfile');
const { buildProfileEmbed } = require('../utils/profileEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playerprofile')
    .setDescription('View a comprehensive player profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user to look up (defaults to you)'))
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Look up by gamertag (case-insensitive)')),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const gamertag = interaction.options.getString('gamertag');

    const identity = gamertag
      ? { gamertag }
      : { discordId: (targetUser || interaction.user).id };

    const { player, error, ...profile } = await getPlayerProfile(identity);

    if (error) {
      if (error.message === 'PLAYER_NOT_FOUND') {
        return interaction.reply({
          content: 'Player not found. If you are new, use /register first.',
          ephemeral: true,
        });
      }
      console.error('Error fetching player profile:', error);
      return interaction.reply({ content: 'Unable to load profile right now.', ephemeral: true });
    }

    const embed = buildProfileEmbed({ player, ...profile });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

