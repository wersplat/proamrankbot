const { EmbedBuilder } = require('discord.js');

function formatSocials(player) {
  const links = [];
  if (player.twitch) links.push(`Twitch: ${player.twitch}`);
  if (player.twitter_id) links.push(`Twitter: ${player.twitter_id}`);
  if (player.instagram_url) links.push(`Instagram: ${player.instagram_url}`);
  if (player.youtube_url) links.push(`YouTube: ${player.youtube_url}`);
  if (player.tiktok_url) links.push(`TikTok: ${player.tiktok_url}`);
  if (player.discord_url) links.push(`Discord: ${player.discord_url}`);
  if (player.facebook_url) links.push(`Facebook: ${player.facebook_url}`);
  return links.length ? links.join('\n') : 'No socials on file.';
}

function formatHandles(handles = []) {
  if (!handles.length) return 'No alternate handles on file.';
  return handles
    .map(h => {
      const range = h.valid_from ? ` (since ${h.valid_from})` : '';
      return `${h.primary_gt || h.alt_gt || 'Unknown'}${range}`;
    })
    .join('\n');
}

function formatAwards(awards = []) {
  if (!awards.length) return 'No awards yet.';
  return awards
    .map(a => `${a.title || 'Award'} (${a.tier || 'N/A'})`)
    .join('\n');
}

function formatVideos(videos = []) {
  if (!videos.length) return 'No highlight videos yet.';
  return videos
    .map(v => {
      const title = v.title || 'Highlight';
      return v.video_url ? `[${title}](${v.video_url})` : title;
    })
    .join('\n');
}

function formatRecentStats(recentStats) {
  if (!recentStats?.perGame) return 'No recent games.';
  const { sampleSize, perGame } = recentStats;
  return `Last ${sampleSize} games: ${perGame.points} PTS / ${perGame.rebounds} REB / ${perGame.assists} AST / ${perGame.steals} STL / ${perGame.blocks} BLK / ${perGame.turnovers} TO`;
}

function buildProfileEmbed(profile) {
  const { player, rpValue, positionLabel, globalRank, totalPlayers, recentStats, awards, videos, handles } = profile;
  const teamName = player.teams?.name || player.currentTeamName || 'Free Agent';
  const salaryTier = player.salary_tier || 'Unassigned';
  const rankPercentile = totalPlayers ? (((totalPlayers - globalRank + 1) / totalPlayers) * 100).toFixed(1) : 'N/A';

  const embed = new EmbedBuilder()
    .setTitle(`${player.gamertag} — Player Profile`)
    .setDescription(player.alternate_gamertag ? `Also known as ${player.alternate_gamertag}` : ' ')
    .addFields(
      { name: 'Team', value: teamName, inline: true },
      { name: 'Position', value: positionLabel, inline: true },
      { name: 'Salary Tier', value: salaryTier, inline: true },
      { name: 'RP', value: `${rpValue}`, inline: true },
      { name: 'Global Rank', value: totalPlayers ? `#${globalRank} of ${totalPlayers} (${rankPercentile}th pct)` : 'N/A', inline: true },
      { name: 'Recent Form', value: formatRecentStats(recentStats), inline: false },
      { name: 'Awards', value: formatAwards(awards), inline: false },
      { name: 'Highlights', value: formatVideos(videos), inline: false },
      { name: 'Handles', value: formatHandles(handles), inline: false },
      { name: 'Socials', value: formatSocials(player), inline: false },
    )
    .setTimestamp(new Date());

  if (player.teams?.logo_url) {
    embed.setThumbnail(player.teams.logo_url);
  }

  return embed;
}

module.exports = {
  buildProfileEmbed,
};

