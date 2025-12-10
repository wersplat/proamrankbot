const supabase = require('../supabase/client');

const BASE_PLAYER_SELECT = `
  id,
  gamertag,
  alternate_gamertag,
  discord_id,
  position,
  current_team_id,
  player_rp,
  player_rank_score,
  salary_tier,
  monthly_value,
  is_rookie,
  crewName,
  currentTeamName,
  twitch,
  twitter_id,
  instagram_url,
  youtube_url,
  tiktok_url,
  discord_url,
  facebook_url,
  teams:teams!players_current_team_id_fkey(name,logo_url)
`;

function pickRp(player) {
  return player?.player_rp ?? player?.rp ?? 0;
}

function formatPosition(raw) {
  if (!raw) return 'Unknown';
  const map = {
    'PG': 'Point Guard',
    'SG': 'Shooting Guard',
    'SF': 'Small Forward',
    'PF': 'Power Forward',
    'C': 'Center'
  };
  return map[raw] || raw;
}

function averageRecentStats(rows) {
  if (!rows || rows.length === 0) {
    return { sampleSize: 0, perGame: null };
  }

  const total = rows.reduce((acc, row) => {
    acc.points += row.points || 0;
    acc.rebounds += row.rebounds || 0;
    acc.assists += row.assists || 0;
    acc.steals += row.steals || 0;
    acc.blocks += row.blocks || 0;
    acc.turnovers += row.turnovers || 0;
    return acc;
  }, { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0 });

  const div = rows.length;
  return {
    sampleSize: div,
    perGame: {
      points: +(total.points / div).toFixed(1),
      rebounds: +(total.rebounds / div).toFixed(1),
      assists: +(total.assists / div).toFixed(1),
      steals: +(total.steals / div).toFixed(1),
      blocks: +(total.blocks / div).toFixed(1),
      turnovers: +(total.turnovers / div).toFixed(1),
    }
  };
}

async function fetchPlayer({ discordId, gamertag }) {
  let query = supabase
    .from('players')
    .select(BASE_PLAYER_SELECT)
    .limit(1);

  if (gamertag) {
    query = query.ilike('gamertag', gamertag);
  } else if (discordId) {
    query = query.eq('discord_id', discordId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { error };
  return { player: data || null };
}

async function getPlayerProfile({ discordId, gamertag }) {
  const { player, error: playerError } = await fetchPlayer({ discordId, gamertag });
  if (playerError) {
    return { error: playerError };
  }
  if (!player) {
    return { error: new Error('PLAYER_NOT_FOUND') };
  }

  const rpValue = pickRp(player);

  const statsQuery = supabase
    .from('player_stats')
    .select('points,rebounds,assists,steals,blocks,turnovers,created_at,match_id')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const awardsQuery = supabase
    .from('player_awards')
    .select('title,tier,awarded_at,match_id')
    .eq('player_id', player.id)
    .order('awarded_at', { ascending: false })
    .limit(3);

  const videosQuery = supabase
    .from('player_videos')
    .select('title,video_url,description,is_highlight,created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const handlesQuery = supabase
    .from('player_handles')
    .select('primary_gt,alt_gt,game_year,valid_from,valid_to')
    .eq('player_id', player.id)
    .order('valid_from', { ascending: false })
    .limit(3);

  const totalPlayersQuery = supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  const higherRankedQuery = supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gt('player_rp', rpValue);

  const [
    { data: recentStats, error: statsError },
    { data: awards, error: awardsError },
    { data: videos, error: videosError },
    { data: handles, error: handlesError },
    { count: totalPlayers, error: totalPlayersError },
    { count: higherRankedPlayers, error: higherRankedError },
  ] = await Promise.all([
    statsQuery,
    awardsQuery,
    videosQuery,
    handlesQuery,
    totalPlayersQuery,
    higherRankedQuery,
  ]);

  const rankErrors = [statsError, awardsError, videosError, handlesError, totalPlayersError, higherRankedError].filter(Boolean);
  if (rankErrors.length) {
    return { error: rankErrors[0] };
  }

  const globalRank = (higherRankedPlayers || 0) + 1;

  const averages = averageRecentStats(recentStats || []);

  return {
    player,
    rpValue,
    positionLabel: formatPosition(player.position),
    globalRank,
    totalPlayers: totalPlayers || 0,
    recentStats: averages,
    awards: awards || [],
    videos: videos || [],
    handles: handles || [],
  };
}

module.exports = {
  getPlayerProfile,
};

