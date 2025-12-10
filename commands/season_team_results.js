const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const supabase = require('../supabase/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_team_results')
    .setDescription('View team standings for a league season (modal input)'),

  async execute(interaction) {
    // Show modal to collect season and optional team input
    const modal = new ModalBuilder()
      .setCustomId('seasonTeamResultsModal')
      .setTitle('Season Team Standings');

    const seasonInput = new TextInputBuilder()
      .setCustomId('seasonInput')
      .setLabel('Season (e.g., "UPA S3")')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const teamInput = new TextInputBuilder()
      .setCustomId('teamInput')
      .setLabel('Team name (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(seasonInput),
      new ActionRowBuilder().addComponents(teamInput)
    );

    await interaction.showModal(modal);

    let submitted;
    try {
      submitted = await interaction.awaitModalSubmit({
        filter: i => i.customId === 'seasonTeamResultsModal' && i.user.id === interaction.user.id,
        time: 60000,
      });
    } catch (err) {
      return interaction.followUp({
        content: 'Modal timed out. Please try again.',
        ephemeral: true,
      });
    }

    await submitted.deferReply({ ephemeral: true });

    const seasonQuery = submitted.fields.getTextInputValue('seasonInput');
    const teamQueryRaw = submitted.fields.getTextInputValue('teamInput');
    const teamQuery = teamQueryRaw ? teamQueryRaw.trim() : '';

    // Resolve season
    const seasonMatch = await findSeasonByName(seasonQuery);
    if (seasonMatch.error) {
      return submitted.editReply({ content: seasonMatch.error, ephemeral: true });
    }

    // Base query
    const baseQuery = supabase
      .from('league_results')
      .select('*')
      .eq('season_id', seasonMatch.id);

    let teamMatch = null;
    if (teamQuery) {
      teamMatch = await findTeamByName(teamQuery);
      if (teamMatch.error) {
        return submitted.editReply({ content: teamMatch.error, ephemeral: true });
      }
      baseQuery.eq('team_id', teamMatch.id);
    } else {
      baseQuery
        .order('wins', { ascending: false })
        .order('win_percentage', { ascending: false });
    }

    const { data: standings, error } = await baseQuery;

    if (error) {
      console.error('Error fetching season standings:', error);
      return submitted.editReply({ content: 'Error fetching season standings.', ephemeral: true });
    }

    if (!standings || standings.length === 0) {
      return submitted.editReply({ content: 'No standings found for that season.', ephemeral: true });
    }

    const header = standings[0];
    const headerLine = `**${header.league_name || 'League'} S${header.season_number || '?'} Standings**`;

    const bodyLines = standings.map((row, idx) => {
      const rank = row.final_placement || idx + 1;
      return `#${rank} ${row.team_name} — ${row.wins}-${row.losses} (${row.win_percentage ?? 'N/A'}) | PF: ${row.points_for ?? 0} | PA: ${row.points_against ?? 0}`;
    });

    // Paginate every 10 records
    const pageCount = Math.ceil(bodyLines.length / 10);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const slice = bodyLines.slice(pageIndex * 10, pageIndex * 10 + 10);
      const content = [
        headerLine,
        pageCount > 1 ? `Page ${pageIndex + 1}/${pageCount}` : null,
        ...slice,
      ]
        .filter(Boolean)
        .join('\n');

      if (pageIndex === 0) {
        await submitted.editReply({ content, ephemeral: true });
      } else {
        await submitted.followUp({ content, ephemeral: true });
      }
    }

    return;
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

async function findTeamByName(query) {
  const input = query.trim().toLowerCase();
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name');

  if (error) {
    console.error('Error fetching teams:', error);
    return { error: 'Error fetching teams.' };
  }
  if (!teams || teams.length === 0) {
    return { error: 'No teams found.' };
  }

  let best = null;
  let bestScore = -Infinity;
  for (const t of teams) {
    const name = (t.name || '').toLowerCase();
    const dist = levenshtein(input, name);
    const sim = 1 - dist / Math.max(input.length, name.length, 1);
    const exact = input === name;
    const contains = name.includes(input);
    const score = exact ? 2 : contains ? 1.5 + sim : sim;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (!best || bestScore < 0.3) {
    return { error: 'No matching team found. Try a clearer team name.' };
  }
  return { id: best.id, record: best };
}

