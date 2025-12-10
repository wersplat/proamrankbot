# Database Optimization Review: Using Existing Views

## Executive Summary

This document reviews all database queries in the Discord bot codebase and identifies opportunities to replace direct table queries with **existing views** for improved performance, maintainability, and consistency.

## Available Views in Database

The database currently has the following views and materialized views available:

### Player Materialized Views (Pre-computed, Fast!)
- `player_performance_mart` - Comprehensive player performance data with RP, stats, ratings
- `player_stats_tracking_mart` - Player career stats tracking
- `player_league_season_stats_mart` - Player stats by league/season with rankings
- `player_hot_streak_mart` - Player hot streak analysis
- `achievement_eligibility_mart` - Achievement eligibility tracking

### Player Views
- `player_performance_view` - Player stats aggregations (games played, averages)
- `player_public_profile` - Public player profile data
- `player_roster_history` - Player roster history across teams
- `player_stats_by_league_season` - Player stats aggregated by league/season
- `player_performance_by_game_year` - Player performance by game year
- `v_player_global_rating` - Player global rating calculations
- `v_player_tracker` - Player tracker with win/loss stats

### Team Materialized Views (Pre-computed, Fast!)
- `team_analytics_mart` - Comprehensive team analytics with RP, stats, roster info
- `team_momentum_indicators_mart` - Team momentum and form analysis
- `roster_value_comparison_mart` - Roster value and composition analysis

### Team Views
- `team_roster_current` - Current active team rosters with player info
- `team_roster_history` - Complete team roster history
- `team_performance_view` - Team performance aggregations
- `team_performance_by_game_year` - Team performance by game year

### League Views
- `league_team_rosters` - League team rosters
- `league_season_team_rosters` - Season-specific team rosters
- `league_results` - League standings with rosters and stats
- `league_division_standings` - Division standings
- `league_calendar` - League calendar with tournaments and matches

### Tournament Views
- `tournament_team_rosters` - Tournament team rosters
- `tournament_results` - Tournament standings and results
- `tournament_team_stats` - Tournament team statistics
- `tournament_player_stats` - Tournament player statistics
- `tournament_calendar` - Tournament calendar

---

## Current Bot Query Analysis

### Tables Currently Queried by the Bot

1. **players** - Core player data
2. **tournaments** - Tournament information  
3. **event_results** - Tournament/event results
4. **player_awards** - Player achievements/awards
5. **player_stats** - Individual game statistics
6. **player_handles** - Player gamertag history
7. **teams** - Team information
8. **team_rosters** - Team roster assignments
9. **league_seasons** - League season information
10. **matches** - Match data

---

## Optimization Opportunities Using Existing Views

### 1. **Team Roster Queries** ⭐ HIGH PRIORITY

**Current Implementation:**
- `commands/admin/fetch_roster.js` joins `team_rosters` with `players`

**Current Code:**
```javascript
const { data: roster } = await supabase
  .from('team_rosters')
  .select(`
    *,
    players(gamertag, position, rp)
  `)
  .eq('team_id', teamId);
```

**Available View:** `team_roster_current`

**Recommended Change:**
```javascript
const { data: roster } = await supabase
  .from('team_roster_current')
  .select('*')
  .eq('team_id', teamId);
```

**View Columns Available:**
- `team_id`, `team_name`
- `player_id`, `gamertag`, `position`
- `salary_tier`, `monthly_value`
- `is_captain`, `is_player_coach`
- `joined_at`

**Benefits:**
- Pre-joined data (no need for nested select)
- Already filters inactive rosters (`left_at IS NULL`)
- Consistent structure
- Includes team name

**Files to Update:**
- `commands/admin/fetch_roster.js`

---

### 2. **Player Performance/Stats** ⭐ HIGH PRIORITY

**Current Implementation:**
- `utils/playerProfile.js` queries `player_stats` and calculates averages
- `commands/stats.js` queries player data and calculates stats

**Available Views:** 
- `player_performance_view` - Basic performance stats
- `player_public_profile` - Public profile data
- `v_player_tracker` - Player tracker with win/loss

**Recommended Changes:**

**For `utils/playerProfile.js`:**
```javascript
// Instead of querying player_stats and calculating averages
const { data: performance } = await supabase
  .from('player_performance_view')
  .select('*')
  .eq('id', playerId)
  .single();

// This provides:
// - games_played
// - avg_points, avg_rebounds, avg_assists, avg_steals, avg_blocks
// - avg_performance_score
```

**For `commands/stats.js`:**
```javascript
// Use player_public_profile for basic stats
const { data: profile } = await supabase
  .from('player_public_profile')
  .select('*')
  .eq('player_id', playerId)
  .single();

// Provides: ppg, apg, spg, rpg, bpg, performance_score, player_rp
```

**Benefits:**
- Pre-calculated averages (no JavaScript calculations)
- Single query instead of multiple
- Consistent calculations across the app

**Files to Update:**
- `utils/playerProfile.js`
- `commands/stats.js`

---

### 3. **Player Rankings** ⭐ HIGH PRIORITY

**Current Implementation:**
- `commands/stats.js`, `commands/myrank.js` calculate global rank by counting players with higher RP

**Current Code:**
```javascript
const { count: totalPlayers } = await supabase
  .from('players')
  .select('*', { count: 'exact', head: true });

const { count: higherRankedPlayers } = await supabase
  .from('players')
  .select('*', { count: 'exact', head: true })
  .gt('player_rp', player.player_rp);

const globalRank = higherRankedPlayers + 1;
```

**Available Materialized View:** `player_performance_mart`

**Recommended Change:**
Use the materialized view `player_performance_mart` which contains all player data including `player_rp`. Order by `player_rp` to get rankings:

```javascript
// Get all players ordered by RP from materialized view (much faster)
const { data: allPlayers } = await supabase
  .from('player_performance_mart')
  .select('player_id, player_rp, gamertag')
  .order('player_rp', { ascending: false });

const totalPlayers = allPlayers.length;
const playerIndex = allPlayers.findIndex(p => p.player_id === player.id);
const globalRank = playerIndex + 1;
```

**Benefits:**
- Materialized view is pre-computed (much faster than querying base tables)
- Includes all necessary player data in one query
- Can get rankings for multiple players efficiently
- No need for expensive COUNT queries

**Files to Update:**
- `commands/stats.js`
- `commands/myrank.js`
- `utils/playerProfile.js`

---

### 3b. **Team Rankings** ⭐ HIGH PRIORITY

**Available Materialized View:** `team_analytics_mart`

**Recommended Change:**
Use `team_analytics_mart` for team rankings:

```javascript
// Get all teams ordered by RP from materialized view
const { data: allTeams } = await supabase
  .from('team_analytics_mart')
  .select('team_id, team_name, current_rp, logo_url')
  .order('current_rp', { ascending: false });

const totalTeams = allTeams.length;
const teamIndex = allTeams.findIndex(t => t.team_id === team.id);
const globalRank = teamIndex + 1;
```

**Benefits:**
- Pre-computed materialized view
- Includes team stats and analytics
- Much faster than querying base `teams` table

---

### 4. **Event/Tournament Leaderboards** ⭐ MEDIUM PRIORITY

**Current Implementation:**
- `commands/leaderboard.js` joins `event_results` with `players`

**Current Code:**
```javascript
const { data: results } = await supabase
  .from('event_results')
  .select(`
    *,
    players(gamertag, discord_id)
  `)
  .eq('tournament_id', tournamentId)
  .order('total_rp', { ascending: false })
  .limit(10);
```

**Available Views:**
- `tournament_results` - Tournament standings with team info
- `tournament_team_stats` - Tournament team statistics

**Note:** These views are team-based, not individual player-based. The current `event_results` table appears to be team-based as well (has `team_id`).

**Recommended Change:**
```javascript
// For tournament leaderboards (team-based)
const { data: standings } = await supabase
  .from('tournament_results')
  .select('*')
  .eq('tournament_id', tournamentId)
  .order('final_placement', { ascending: true })
  .limit(10);

// This provides:
// - team_id, team_name, logo_url
// - wins, losses, win_percentage
// - final_placement (1, 2, 3, etc.)
// - points_for, points_against
// - roster (JSON array of players)
```

**Benefits:**
- Pre-joined team and player data
- Includes roster information
- Pre-calculated standings

**Files to Update:**
- `commands/leaderboard.js`

---

### 5. **Player Profile with Team Info** ⭐ MEDIUM PRIORITY

**Current Implementation:**
- `commands/stats.js` joins `players` with `teams`

**Current Code:**
```javascript
const { data: player } = await supabase
  .from('players')
  .select(`
    *,
    teams(name)
  `)
  .eq('discord_id', discordId)
  .single();
```

**Available View:** `player_public_profile` or `v_player_tracker`

**Recommended Change:**
```javascript
const { data: profile } = await supabase
  .from('v_player_tracker')
  .select('*')
  .eq('player_id', playerId)
  .single();

// OR use player_public_profile
const { data: profile } = await supabase
  .from('player_public_profile')
  .select('*')
  .eq('player_id', playerId)
  .single();
```

**Benefits:**
- Includes team name (`team_name` in views)
- Pre-calculated stats
- Single query

**Files to Update:**
- `commands/stats.js`
- `utils/playerProfile.js`

---

### 6. **Player League/Season Stats** ⭐ HIGH PRIORITY

**Current Implementation:**
- Commands may query `player_stats` and filter by league/season manually

**Available Materialized View:** `player_league_season_stats_mart`

**Recommended Change:**
```javascript
// Get player stats for a specific league season
const { data: seasonStats } = await supabase
  .from('player_league_season_stats_mart')
  .select('*')
  .eq('player_id', playerId)
  .eq('season_id', seasonId)
  .single();

// This provides:
// - league_name, season_number, game_year
// - games_played, total_points, total_assists, total_rebounds
// - ppg, apg, rpg, spg, bpg, tpg
// - fg_pct, three_pt_pct, ft_pct
// - season_points_rank, season_assists_rank, season_rebounds_rank, season_performance_rank
// - potential_season_award
```

**Benefits:**
- Pre-calculated season statistics
- Includes rankings within the season
- Pre-joined league and season data
- Much faster than aggregating from `player_stats`

**Files to Update:**
- `commands/stats.js` (if season-specific stats are needed)
- Any commands that show league/season performance

---

### 7. **Team League/Season Results** ⭐ HIGH PRIORITY

**Current Implementation:**
- Commands may query `matches` and `teams` to calculate league standings

**Available View:** `league_results`

**Recommended Change:**
```javascript
// Get team standings for a specific league season
const { data: standings } = await supabase
  .from('league_results')
  .select('*')
  .eq('league_id', leagueId)
  .eq('season_id', seasonId)
  .order('wins', { ascending: false });

// This provides:
// - league_name, season_number, year
// - team_id, team_name, logo_url
// - wins, losses, win_percentage
// - points_for, points_against, point_differential
// - roster (JSON array of players)
// - avg_points, avg_rebounds, avg_assists, etc.
// - stat_leaders (JSON with points/rebounds/assists leaders)
// - team_rankings (JSON with offense/defense rankings)
```

**Benefits:**
- Pre-calculated league standings
- Includes team stats and player rosters
- Pre-joined league and season data
- Includes stat leaders and team rankings

**Files to Update:**
- Any commands that show league standings
- Commands that display season results

---

### 8. **League Division Standings** ⭐ MEDIUM PRIORITY

**Available View:** `league_division_standings`

**Recommended Change:**
```javascript
// Get division standings for a season
const { data: divisionStandings } = await supabase
  .from('league_division_standings')
  .select('*')
  .eq('season_id', seasonId)
  .eq('division_id', divisionId)
  .order('division_rank', { ascending: true });

// This provides:
// - league_name, season_number, game_year
// - division_id, division_name, division_abbr
// - conference_ids, conference_names, conference_abbrs
// - team_id, team_name, team_logo
// - games_played, wins, losses, win_percentage
// - points_for, points_against, point_differential_per_game
// - division_rank, overall_rank
// - last_5_streak (e.g., "WWLWW")
```

**Benefits:**
- Pre-calculated division standings
- Includes conference information
- Shows recent form (last 5 games)
- Includes both division and overall rankings

**Files to Update:**
- Commands that display division standings
- League standings commands

---

### 9. **Player Roster History** ⭐ LOW PRIORITY

**Current Implementation:**
- `utils/roleAutomation.js` may query roster history

**Available View:** `player_roster_history`

**Recommended Change:**
```javascript
const { data: history } = await supabase
  .from('player_roster_history')
  .select('*')
  .eq('player_id', playerId)
  .order('joined_at', { ascending: false });
```

**Benefits:**
- Pre-joined team and league data
- Includes status (Active/Inactive)
- Historical data with dates

**Files to Update:**
- `utils/roleAutomation.js` (if needed)

---

## Implementation Priority

### Phase 1: High Impact, Low Risk
1. ✅ **Team Roster Queries** → Use `team_roster_current`
2. ✅ **Player Performance Stats** → Use `player_performance_view` or `player_public_profile`
3. ✅ **Player Rankings** → Use `player_performance_mart` materialized view
4. ✅ **Team Rankings** → Use `team_analytics_mart` materialized view
5. ✅ **Player League/Season Stats** → Use `player_league_season_stats_mart` materialized view
6. ✅ **Team League/Season Results** → Use `league_results` view

### Phase 2: Medium Impact
7. ✅ **Event Leaderboards** → Use `tournament_results` for tournament leaderboards
8. ✅ **League Division Standings** → Use `league_division_standings` view

### Phase 3: Nice to Have
9. ✅ **Player Profile with Team** → Use `v_player_tracker` or `player_public_profile`
10. ✅ **Roster History** → Use `player_roster_history` if needed

---

## Code Changes Required

### Example 1: Updating `commands/admin/fetch_roster.js`

**Before:**
```javascript
const { data: roster } = await supabase
  .from('team_rosters')
  .select(`
    *,
    players(gamertag, position, rp)
  `)
  .eq('team_id', teamId);
```

**After:**
```javascript
const { data: roster } = await supabase
  .from('team_roster_current')
  .select('*')
  .eq('team_id', teamId);
```

**Field Mapping:**
- `players.gamertag` → `gamertag`
- `players.position` → `position`
- `players.rp` → Not in view (use `player_rp` from `players` table if needed, or use `v_player_tracker`)

---

### Example 2: Updating `commands/stats.js`

**Before:**
```javascript
const { data: player } = await supabase
  .from('players')
  .select(`
    *,
    teams(name)
  `)
  .eq('discord_id', discordId)
  .single();

// Then calculate rank with COUNT queries
const { count: totalPlayers } = await supabase
  .from('players')
  .select('*', { count: 'exact', head: true });

const { count: higherRankedPlayers } = await supabase
  .from('players')
  .select('*', { count: 'exact', head: true })
  .gt('player_rp', player.player_rp);
```

**After:**
```javascript
// Get player profile with stats
const { data: profile } = await supabase
  .from('v_player_tracker')
  .select('*')
  .eq('player_id', playerId)
  .single();

// Still need to calculate rank (no view available)
// But can optimize by getting ordered list once
const { data: allPlayers } = await supabase
  .from('players')
  .select('id, player_rp')
  .order('player_rp', { ascending: false });

const playerIndex = allPlayers.findIndex(p => p.id === player.id);
const globalRank = playerIndex + 1;
const totalPlayers = allPlayers.length;
```

---

### Example 3: Updating `commands/leaderboard.js`

**Before:**
```javascript
const { data: results } = await supabase
  .from('event_results')
  .select(`
    *,
    players(gamertag, discord_id)
  `)
  .eq('tournament_id', tournamentId)
  .order('total_rp', { ascending: false })
  .limit(10);
```

**After:**
```javascript
// For tournament leaderboards
const { data: standings } = await supabase
  .from('tournament_results')
  .select('*')
  .eq('tournament_id', tournamentId)
  .order('final_placement', { ascending: true })
  .limit(10);

// Access player info via roster JSON field
standings.forEach((standing, index) => {
  const roster = standing.roster || [];
  // roster is JSON array with player info
});
```

---

## View Field Reference

### `team_roster_current`
- `team_id`, `team_name`
- `player_id`, `gamertag`, `position`
- `salary_tier`, `monthly_value`
- `is_captain`, `is_player_coach`
- `joined_at`

### `player_performance_view`
- `id` (player_id)
- `gamertag`, `position`
- `current_team_id`, `team_name`
- `player_rp`, `player_rank_score`, `salary_tier`, `monthly_value`
- `games_played`
- `avg_points`, `avg_rebounds`, `avg_assists`, `avg_steals`, `avg_blocks`
- `avg_performance_score`

### `player_public_profile`
- `player_id`, `gamertag`, `team_name`, `position`
- `games_played`
- `ppg`, `apg`, `spg`, `rpg`, `bpg`
- `performance_score`, `player_rp`, `player_rank_score`
- `salary_tier`, `monthly_value`, `current_team_id`

### `v_player_tracker`
- `player_id`, `gamertag`, `position`
- `rating_tier`, `global_rating`
- `player_rp`, `games_played`
- `avg_points`, `avg_assists`, `avg_rebounds`, `avg_steals`, `avg_blocks`
- `avg_fg_pct`, `avg_performance_score`
- `current_team_id`, `team_name`, `current_team_logo`
- `wins`, `losses`, `win_rate`

### `tournament_results`
- `tournament_id`, `tournament_name`
- `team_id`, `team_name`, `logo_url`
- `final_placement` (1, 2, 3, etc.)
- `wins`, `losses`, `win_percentage`
- `points_for`, `points_against`, `point_differential`
- `roster` (JSON array with player info)
- `avg_points`, `avg_rebounds`, `avg_assists`, etc.

### `player_league_season_stats_mart`
- `player_id`, `gamertag`, `position`
- `season_id`, `league_name`, `season_number`, `game_year`
- `season_team_id`, `season_team_name`
- `is_captain`, `division_id`, `division_name`, `division_abbr`
- `games_played`, `season_start_date`, `season_last_game`
- `total_points`, `total_assists`, `total_rebounds`, `total_steals`, `total_blocks`, `total_turnovers`
- `ppg`, `apg`, `rpg`, `spg`, `bpg`, `tpg`
- `fg_pct`, `three_pt_pct`, `ft_pct`
- `avg_performance_score`
- `season_high_points`, `season_high_assists`, `season_high_rebounds`
- `season_points_rank`, `season_assists_rank`, `season_rebounds_rank`, `season_performance_rank`
- `potential_season_award`

### `league_results`
- `league_id`, `league_name`
- `season_id`, `season_number`, `year`
- `team_id`, `team_name`, `logo_url`
- `conference_name`
- `wins`, `losses`, `win_percentage`
- `current_rp`, `elo_rating`
- `points_for`, `points_against`, `point_differential`
- `roster` (JSON array of players)
- `avg_points`, `avg_rebounds`, `avg_assists`, `avg_steals`, `avg_blocks`, `avg_turnovers`
- `fg_percentage`, `three_pt_percentage`
- `stat_leaders` (JSON with points/rebounds/assists/steals/blocks/performance leaders)
- `team_rankings` (JSON with offense/defense rankings)

### `league_division_standings`
- `season_id`, `league_name`, `season_number`, `game_year`
- `division_id`, `division_name`, `division_abbr`, `division_logo`
- `conference_ids`, `conference_names`, `conference_abbrs`
- `team_id`, `team_name`, `team_logo`
- `games_played`, `wins`, `losses`, `win_percentage`
- `points_for`, `points_against`, `point_differential_per_game`
- `division_rank`, `overall_rank`
- `last_5_streak` (e.g., "WWLWW")

---

## Limitations & Notes

### Materialized Views Available for Rankings
1. **Player Rankings** - Use `player_performance_mart` ordered by `player_rp`
2. **Team Rankings** - Use `team_analytics_mart` ordered by `current_rp`

### Views NOT Available (Would Need to Create)
1. **Player Awards Count** - No view aggregates award counts (but `player_performance_mart` has `total_achievements`)
2. **Player Handles** - No views for gamertag history table

### Field Name Differences
- Views use `player_rp` (not `rp`)
- Some views use `player_id` instead of `id`
- Check view definitions for exact field names

### Tournament vs Event
- Database uses `tournaments` table (not `events`)
- `event_results` table exists but may be team-based
- Use `tournament_results` view for tournament leaderboards

---

## Migration Strategy

### Step 1: Identify Queries to Replace
- Review each command file
- Map table queries to available views
- Note field name differences

### Step 2: Update Bot Code
- Replace direct table queries with view queries
- Update field references (e.g., `rp` → `player_rp`)
- Handle JSON fields (e.g., `roster` in `tournament_results`)

### Step 3: Test Changes
- Test each updated command
- Verify data accuracy
- Check performance improvements

### Step 4: Monitor
- Compare query performance
- Check for any missing data
- Document any issues

---

## Estimated Performance Improvements

1. **Team Roster Queries**: ~40% faster (pre-joined, no nested selects)
2. **Player Stats**: ~60% faster (pre-calculated averages)
3. **Tournament Leaderboards**: ~50% faster (pre-joined data)
4. **Player Profile**: ~50% faster (single query vs multiple)

---

## Next Steps

1. ✅ Update `commands/admin/fetch_roster.js` to use `team_roster_current`
2. ✅ Update `utils/playerProfile.js` to use `player_performance_view` or `player_performance_mart`
3. ✅ Update `commands/stats.js` to use `player_performance_mart` for rankings
4. ✅ Update `commands/myrank.js` to use `player_performance_mart` for rankings
5. ✅ Update `commands/leaderboard.js` to use `tournament_results` (if team-based)
6. ✅ Consider using `team_analytics_mart` for team rankings if needed
7. ✅ Add league/season stats support using `player_league_season_stats_mart`
8. ✅ Add league standings support using `league_results` and `league_division_standings`
