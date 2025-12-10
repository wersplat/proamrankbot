const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_player_stats')
    .setDescription('View your stats for a specific league season')
    .addStringOption(option =>
      option
        .setName('season')
        .setDescription('Season name/number (e.g., "UPA S3")')
        .setRequired(true)
    ),

  async execute(interaction) {
    const seasonQuery = interaction.options.getString('season');
    const discordId = interaction.user.id;

    // Resolve player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, gamertag')
      .eq('discord_id', discordId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return interaction.reply({ content: 'Error fetching player.', ephemeral: true });
    }
    if (!player) {
      return interaction.reply({ content: 'No player found for your Discord account.', ephemeral: true });
    }

    // Resolve season by friendly name (fuzzy-ish matching)
    const seasonMatch = await findSeasonByName(seasonQuery);
    if (seasonMatch.error) {
      return interaction.reply({ content: seasonMatch.error, ephemeral: true });
    }

    // Fetch season stats from materialized view
    const { data: stats, error: statsError } = await supabase
      .from('player_league_season_stats_mart')
      .select('*')
      .eq('player_id', player.id)
      .eq('season_id', seasonMatch.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching season stats:', statsError);
      return interaction.reply({ content: 'Error fetching season stats.', ephemeral: true });
    }

    if (!stats) {
      return interaction.reply({ content: 'No stats found for that season.', ephemeral: true });
    }

    const lines = [];
    lines.push(`**${stats.league_name || 'League'} S${stats.season_number || '?'} (${stats.game_year || 'N/A'})**`);
    lines.push(`Team: ${stats.season_team_name || 'Free Agent'}`);
    lines.push(`Games: ${stats.games_played}`);
    lines.push(`PPG: ${stats.ppg} | APG: ${stats.apg} | RPG: ${stats.rpg} | SPG: ${stats.spg} | BPG: ${stats.bpg}`);
    lines.push(`FG%: ${stats.fg_pct || 'N/A'} | 3P%: ${stats.three_pt_pct || 'N/A'} | FT%: ${stats.ft_pct || 'N/A'}`);
    lines.push(`Perf Score: ${stats.avg_performance_score || 'N/A'}`);
    lines.push(`Ranks — PTS: #${stats.season_points_rank || 'N/A'}, AST: #${stats.season_assists_rank || 'N/A'}, REB: #${stats.season_rebounds_rank || 'N/A'}, PERF: #${stats.season_performance_rank || 'N/A'}`);
    if (stats.potential_season_award) {
      lines.push(`Awards: ${stats.potential_season_award}`);
    }

    return interaction.reply({ content: lines.join('\n'), ephemeral: true });
  },
};

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: an + 1 }, () => Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

async function findSeasonByName(query) {
  const input = query.trim().toLowerCase();
  const { data: seasons, error } = await supabase
    .from('league_seasons')
    .select('id, league_name, season_number, year');

  if (error) {
    console.error('Error fetching seasons:', error);
    return { error: 'Error fetching seasons.' };
  }
  if (!seasons || seasons.length === 0) {
    return { error: 'No seasons found.' };
  }

  let best = null;
  let bestScore = -Infinity;
  for (const s of seasons) {
    const name = `${s.league_name || ''} s${s.season_number || ''} ${s.year || ''}`.trim().toLowerCase();
    const dist = levenshtein(input, name);
    const sim = 1 - dist / Math.max(input.length, name.length, 1);
    const exact = input === name;
    const contains = name.includes(input);
    const score = exact ? 2 : contains ? 1.5 + sim : sim;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  if (!best || bestScore < 0.3) {
    return { error: 'No matching season found. Try a clearer season name (e.g., "UPA S3").' };
  }
  return { id: best.id, record: best };
}

