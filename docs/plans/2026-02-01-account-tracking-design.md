# Account Tracking & Trackers Hub Redesign

## Overview

Improve game/tracker result tracking and reorganize the hub to show trackers as first-class items.

## Database Schema

### New Tables

```sql
-- Track game sessions (Hot Take, Like Minded, Quiz, etc.)
create table games.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  game_type text not null,  -- 'hot-take', 'like-minded', 'quiz', 'codenames', 'secret-hitler', 'quirtle'
  played_at timestamptz not null default now(),
  players_count integer,
  won boolean,              -- null if game doesn't have win/loss
  was_host boolean default false
);

create index game_results_user_id_idx on games.game_results(user_id);
create index game_results_played_at_idx on games.game_results(played_at desc);

-- Track card game tracker results (Septica, Whist, Rentz, General)
create table games.tracker_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tracker_type text not null,  -- 'septica', 'whist', 'rentz', 'general'
  played_at timestamptz not null default now(),
  players jsonb not null,      -- ['Alice', 'Bob', 'Carol']
  scores jsonb not null,       -- [150, 120, 90] (same order as players)
  winner_index integer         -- index of winner in players array
);

create index tracker_results_user_id_idx on games.tracker_results(user_id);
create index tracker_results_played_at_idx on games.tracker_results(played_at desc);
```

### Existing Table (No Changes)

`games.game_stats` remains for quick aggregate counts.

## UI Changes

### GameHub.tsx

1. Rename "Tools" tab to "Trackers"
2. Change tab icon from wrench to cards (🃏)
3. Replace single "Score Tracker" card with 4 individual cards:

| Card    | Route                    | Accent Color | Description                    |
|---------|--------------------------|--------------|--------------------------------|
| Septica | `/score-tracker/septica` | #f59e0b      | Track Septica card game scores |
| Whist   | `/score-tracker/whist`   | #8b5cf6      | Track Whist card game scores   |
| Rentz   | `/score-tracker/rentz`   | #ec4899      | Track Rentz card game scores   |
| General | `/score-tracker/general` | #6b7280      | Track any game's scores        |

### Profile Modal (Profile.tsx)

Expand to show:

1. **Summary stats section**:
   - Total games played
   - Total wins
   - Total tracker games
   - Total games hosted

2. **Recent activity section** (last 5-10 sessions):
   - Chronological list mixing games and trackers
   - Games: show player count, win status if applicable, date
   - Trackers: show condensed scores (e.g., "You 150, Bob 120"), date

## Code Changes

### UserContext.tsx

Add new functions:

```typescript
interface GameResult {
  gameType: string;
  playersCount: number;
  won?: boolean;
  wasHost?: boolean;
}

interface TrackerResult {
  trackerType: string;
  players: string[];
  scores: number[];
  winnerIndex?: number;
}

// New context functions
recordGameResult(result: GameResult): Promise<void>
recordTrackerResult(result: TrackerResult): Promise<void>
getRecentActivity(limit?: number): Promise<ActivityItem[]>
```

Both functions:
- Save to localStorage for guest users
- Save to Supabase for authenticated users
- Update aggregate `game_stats` counts

### Integration Points

**Games** - call `recordGameResult()` when:
- Hot Take: round/game ends
- Like Minded: game ends (team win/loss)
- Quiz: game ends (winner = highest score)
- Codenames: game ends (team win/loss)
- Secret Hitler: game ends (team win/loss)
- Quirtle: game ends (winner = highest score)

**Trackers** - call `recordTrackerResult()` when:
- User clicks "End Game" or equivalent
- Data comes from existing ScoreTable component state

## Migration Path

1. Create new database tables via migration
2. Update GameHub.tsx (trackers tab + 4 cards)
3. Update UserContext.tsx (new recording functions)
4. Update Profile.tsx (stats + recent activity)
5. Integrate recording into each game/tracker
