# Whist Live View Feature Design

## Overview

Add real-time spectator links to the Whist score tracker, allowing players to view live scores on their own devices while one host manages scoring.

## Requirements

- **Host-only editing** - One person controls scores, others watch
- **Direct link sharing** - URL like `games.zitti.ro/score-tracker/whist/view/X7K2`
- **Room persistence** - Rooms survive host disconnect, auto-expire after 24h
- **Logged-in users only** - Requires account (enables future game history tracking)
- **Always-on sync** - No toggle, logged-in users automatically get live view capability
- **Anonymous viewers** - Viewers don't need accounts or names
- **Whist only** - Start with Whist, expand to Rentz/Septica/General later

## Architecture

```
Host browser → Supabase DB → Realtime subscription → Viewer browsers
     ↓
 localStorage (backup)
```

- Logged-in hosts: game state syncs to Supabase, share link available
- Anonymous hosts: localStorage only (current behavior)
- Host always has localStorage backup if connection drops

## Database Schema

New table: `games.scoretracker_rooms`

```sql
CREATE TABLE games.scoretracker_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,        -- e.g., "X7K2"
  game_type VARCHAR(20) NOT NULL,         -- "whist" (later: rentz, septica, general)
  host_id UUID NOT NULL,                  -- from UserContext
  players TEXT[] NOT NULL,                -- ["Alice", "Bob", "Charlie"]
  game_config JSONB,                      -- { whistMode: "1-8-1" }
  game_state JSONB NOT NULL,              -- full whistData array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX idx_scoretracker_rooms_code ON games.scoretracker_rooms(code);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games.scoretracker_rooms;
```

Room cleanup: Use Supabase cron or pg_cron to delete rooms where `updated_at < NOW() - INTERVAL '24 hours'`.

## Host Experience

1. Host sets up players as normal
2. Game starts → room automatically created in Supabase (if logged in)
3. Host sees "Share" button in header
4. Clicking Share shows:
   - Direct link with copy button
   - Optional QR code for easy mobile access
5. Small "Live" indicator shows sync status
6. Game plays normally, state syncs on every change

## Viewer Experience

**Route:** `/score-tracker/whist/view/[code]`

**States:**

1. **Loading** - "Connecting to game..."
2. **Active game** - Read-only ScoreTable with:
   - No bid/trick entry buttons
   - No Reset button
   - "LIVE" badge with pulse animation
   - Real-time score updates
3. **Game complete** - Winner announcement, final standings
4. **Error states:**
   - Invalid code → "Game not found"
   - Room expired → "This game has ended"
   - Connection lost → "Reconnecting..." with auto-retry

## Implementation

### Files to Create

1. **`supabase/migrations/003_scoretracker_rooms.sql`**
   - Table creation
   - Indexes
   - Realtime enablement

2. **`src/games/score-tracker/hooks/useWhistRoom.js`**
   - Creates room on game start (logged-in users)
   - Syncs state changes to Supabase
   - Generates/manages room code
   - Wraps existing `useScoreTracker` logic

3. **`src/app/score-tracker/whist/view/[code]/page.tsx`**
   - Viewer route
   - Fetches room by code
   - Subscribes to realtime updates
   - Renders read-only ScoreTable

### Files to Modify

4. **`src/games/score-tracker/components/ScoreTable.jsx`**
   - Add `isViewOnly` prop to disable all interactions
   - Add "Share" button in header (logged-in + room exists)
   - Add "Live" sync indicator

5. **`src/games/score-tracker/components/GamePage.jsx`**
   - Detect logged-in state from UserContext
   - Use `useWhistRoom` hook for Whist when logged in
   - Pass room code and share URL to ScoreTable

### Implementation Order

1. Database migration
2. `useWhistRoom` hook
3. Viewer page with realtime subscription
4. ScoreTable UI updates (viewOnly mode, Share button, Live indicator)
5. GamePage integration

## Future Expansion

Once proven with Whist:
- Add to Rentz (same pattern)
- Add to Septica (team game considerations)
- Add to General tracker
- Game history page (list past games)
- Player statistics across games

## Open Questions (Resolved)

- ~~Toggle vs always-on~~ → Always-on for logged-in users
- ~~Room codes vs direct links~~ → Direct links only
- ~~Viewer identification~~ → Anonymous
- ~~Which games first~~ → Whist only
