# Global Rankings Discord Bot

A Discord bot for NBA 2K Global Rankings system with Supabase integration.

## Features

- Player registration and account linking
- Rank checking and player statistics
- Event registration (both draft pool and BYOT formats)
- Stripe payment integration for paid events
- Admin tools for managing players and events
- Role automation based on player status

## Tech Stack

- **Bot**: Node.js + Discord.js v14
- **Database**: Supabase (Postgres)
- **UI (Future)**: React + Discord Embedded SDK
- **Auth**: Supabase Auth
- **Payments**: Stripe Checkout
- **Deploy**: Railway or Render

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your credentials:
   - `DISCORD_TOKEN` - Your Discord bot token
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `STRIPE_SECRET_KEY` - Your Stripe secret key (optional)
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (optional)
4. Run the bot:
   ```
   npm start
   ```

## Commands

### Player Registration
- `/register` - Register as a player in the Global Rankings system
- `/link_account` - Link your existing player account to your Discord user

### Rankings & Stats
- `/myrank` - Check your current RP, global rank, and draft tier
- `/stats [@user]` - View detailed player statistics
- `/leaderboard [event_id]` - View the leaderboard for a specific event

### Event Registration
- `/join_event` - Join an open event
- `/pay_event` - Pay for event entry with Stripe

### Admin Tools
- `/admin update_rp @user [amount]` - Manually adjust a player's RP
- `/admin award_mvp @user [event_id]` - Award MVP to a player in an event
- `/admin fetch_roster [team_id]` - Fetch a team's roster

## Supabase Tables

- `players`: id, discord_id, gamertag, platform, position, team_id, rp, draft_rating
- `events`: id, name, type, open_status
- `draft_pool`: player_id, event_id, status
- `event_registrations`: player_id, event_id, stripe_paid (bool)
- `player_awards`: player_id, event_id, award_type
- `teams`, `team_rosters`, `event_results` (already exists)

## Role Automation

The bot includes role automation functionality that can be run as a daily cron job to update Discord roles based on:
- Rank tier (Tier 1, Tier 2, FA)
- Event status (Drafted, In Pool)
- Team association

To run the role automation manually:
```
node cron/dailyRoleUpdate.js
```

## Deployment

The bot can be deployed to platforms like Railway or Render. Make sure to set the environment variables in your deployment environment.

## Future Enhancements

- Embedded Activities using Discord Embedded App SDK
- Weekly automated embeds with top rankings
- More sophisticated ranking algorithms
- Tournament bracket management
