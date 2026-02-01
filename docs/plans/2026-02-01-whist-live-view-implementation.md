# Whist Live View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time spectator links to Whist score tracker so logged-in hosts can share a view-only link with other players.

**Architecture:** Logged-in users automatically sync game state to Supabase. A shareable URL allows viewers to subscribe to realtime updates. Host controls all scoring; viewers see read-only updates.

**Tech Stack:** Next.js App Router, Supabase (postgres + realtime), existing `useScoreTracker` hook pattern

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/007_scoretracker_rooms.sql`

**Step 1: Create migration file**

```sql
-- Score Tracker Live View Rooms
-- Table for syncing score tracker state to enable live spectator links

-- Ensure games schema exists
CREATE SCHEMA IF NOT EXISTS games;

CREATE TABLE IF NOT EXISTS games.scoretracker_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,           -- e.g., "X7K2" (short shareable code)
  game_type VARCHAR(20) NOT NULL             -- "whist" (later: rentz, septica, general)
    CHECK (game_type IN ('whist', 'rentz', 'septica', 'general')),
  host_id UUID NOT NULL,                     -- User ID from UserContext (authenticated user)
  players TEXT[] NOT NULL,                   -- Player names array
  game_config JSONB DEFAULT '{}'::jsonb,     -- Game-specific config (e.g., whistMode)
  game_state JSONB NOT NULL,                 -- Full game state (whistData array)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games.scoretracker_rooms ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read (viewers), only host can write
CREATE POLICY "Anyone can read scoretracker rooms"
  ON games.scoretracker_rooms FOR SELECT USING (true);

CREATE POLICY "Anyone can create scoretracker rooms"
  ON games.scoretracker_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update scoretracker rooms"
  ON games.scoretracker_rooms FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete scoretracker rooms"
  ON games.scoretracker_rooms FOR DELETE USING (true);

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE games.scoretracker_rooms;

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS scoretracker_rooms_code_idx ON games.scoretracker_rooms (code);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS scoretracker_rooms_updated_at_idx ON games.scoretracker_rooms (updated_at);

-- Cleanup function for old rooms (24 hours of inactivity)
CREATE OR REPLACE FUNCTION games.cleanup_old_scoretracker_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM games.scoretracker_rooms
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE games.scoretracker_rooms IS 'Live view rooms for score tracker games';

/*
game_config JSONB Structure (Whist):
{
  "whistMode": "1-8-1" | "8-1-8"
}

game_state JSONB Structure (Whist - whistData array):
[
  {
    "index": 0,
    "cards": 1,
    "phase": "complete" | "bidding" | "tricks" | "pending",
    "bids": [null, null, null],
    "tricks": [null, null, null],
    "scores": [null, null, null]
  },
  ...
]
*/
```

**Step 2: Apply migration to Supabase**

Run in Supabase SQL Editor or via CLI:
```bash
# If using Supabase CLI:
supabase db push

# Or manually run the SQL in Supabase Dashboard > SQL Editor
```

**Step 3: Verify**

In Supabase Dashboard:
- Check `games.scoretracker_rooms` table exists
- Check realtime is enabled (Database > Replication > should see the table)

**Step 4: Commit**

```bash
git add supabase/migrations/007_scoretracker_rooms.sql
git commit -m "feat(db): add scoretracker_rooms table for live view"
```

---

## Task 2: Room Code Generator Utility

**Files:**
- Modify: `src/lib/random.js` (add new function)

**Step 1: Add generateShortCode function**

Add to existing `src/lib/random.js`:

```javascript
// Generate a short 4-character room code (letters only, no confusing chars)
// Used for score tracker live view links
export function generateShortCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // No I, L, O (confusing)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Step 2: Verify**

Open browser console on dev server, test:
```javascript
import { generateShortCode } from '@/lib/random'
console.log(generateShortCode()) // Should output like "XKMP"
```

**Step 3: Commit**

```bash
git add src/lib/random.js
git commit -m "feat: add generateShortCode for live view room codes"
```

---

## Task 3: Create useWhistRoom Hook

**Files:**
- Create: `src/games/score-tracker/hooks/useWhistRoom.js`

**Step 1: Create the hook file**

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseGames } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { generateShortCode } from '@/lib/random';
import { useScoreTracker } from './useScoreTracker';

/**
 * Wrapper around useScoreTracker that syncs to Supabase for authenticated users.
 * Enables live view sharing via room code.
 */
export function useWhistRoom() {
  const { isAuthenticated, user } = useUser();
  const scoreTracker = useScoreTracker('whist');

  const [roomCode, setRoomCode] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track if we've created a room for this session
  const roomCreatedRef = useRef(false);

  // Create room when game starts (authenticated users only)
  const createRoom = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return null;
    if (roomCreatedRef.current) return roomCode;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const code = generateShortCode();

      const { data, error } = await supabaseGames
        .from('scoretracker_rooms')
        .insert({
          code,
          game_type: 'whist',
          host_id: user.id,
          players: scoreTracker.players,
          game_config: { whistMode: scoreTracker.whistMode },
          game_state: scoreTracker.whistData,
        })
        .select()
        .single();

      if (error) throw error;

      roomCreatedRef.current = true;
      setRoomCode(data.code);
      return data.code;
    } catch (err) {
      console.error('Failed to create room:', err);
      setSyncError(err.message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user?.id, scoreTracker.players, scoreTracker.whistMode, scoreTracker.whistData, roomCode]);

  // Sync state to Supabase whenever whistData changes
  useEffect(() => {
    if (!roomCode || !isAuthenticated) return;
    if (scoreTracker.whistData.length === 0) return;

    const syncState = async () => {
      try {
        await supabaseGames
          .from('scoretracker_rooms')
          .update({
            game_state: scoreTracker.whistData,
            players: scoreTracker.players,
            updated_at: new Date().toISOString(),
          })
          .eq('code', roomCode);
      } catch (err) {
        console.error('Failed to sync state:', err);
        setSyncError(err.message);
      }
    };

    syncState();
  }, [roomCode, isAuthenticated, scoreTracker.whistData, scoreTracker.players]);

  // Wrap startGame to also create room
  const startGame = useCallback(async (playerNames, gameTypeOverride, customConfig) => {
    scoreTracker.startGame(playerNames, gameTypeOverride, customConfig);

    // Create room after state is set (next tick)
    if (isAuthenticated) {
      setTimeout(async () => {
        await createRoom();
      }, 100);
    }
  }, [scoreTracker, isAuthenticated, createRoom]);

  // Clean up room on new game
  const newGame = useCallback(() => {
    roomCreatedRef.current = false;
    setRoomCode(null);
    setSyncError(null);
    scoreTracker.newGame();
  }, [scoreTracker]);

  // Generate share URL
  const shareUrl = roomCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/score-tracker/whist/view/${roomCode}`
    : null;

  return {
    ...scoreTracker,
    startGame,
    newGame,
    // Live view specific
    roomCode,
    shareUrl,
    syncError,
    isSyncing,
    isLiveEnabled: isAuthenticated,
  };
}
```

**Step 2: Verify hook loads without errors**

Import in GamePage temporarily to check:
```javascript
import { useWhistRoom } from '../hooks/useWhistRoom';
// Verify no import/syntax errors
```

**Step 3: Commit**

```bash
git add src/games/score-tracker/hooks/useWhistRoom.js
git commit -m "feat: add useWhistRoom hook for Supabase sync"
```

---

## Task 4: Create Viewer Page

**Files:**
- Create: `src/app/score-tracker/whist/view/[code]/page.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p src/app/score-tracker/whist/view/\[code\]
```

**Step 2: Create viewer page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, supabaseGames } from "@/lib/supabase/client";
import { ScoreTable } from "@/games/score-tracker/components/ScoreTable";
import "@/games/score-tracker/score-tracker.css";

interface RoomData {
  code: string;
  game_type: string;
  players: string[];
  game_config: {
    whistMode?: string;
  };
  game_state: WhistRound[];
}

interface WhistRound {
  index: number;
  cards: number;
  phase: string;
  bids: (number | null)[];
  tricks: (number | null)[];
  scores: (number | null)[];
}

type ViewerState = "loading" | "connected" | "not_found" | "error";

export default function WhistViewerPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [state, setState] = useState<ViewerState>("loading");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial room data
  useEffect(() => {
    if (!code) {
      setState("not_found");
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabaseGames
          .from("scoretracker_rooms")
          .select("*")
          .eq("code", code)
          .single();

        if (fetchError || !data) {
          setState("not_found");
          return;
        }

        setRoom(data);
        setState("connected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
        setState("error");
      }
    };

    fetchRoom();
  }, [code]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!code || state !== "connected") return;

    const channel = supabase
      .channel(`scoretracker:${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "games",
          table: "scoretracker_rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as RoomData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, state]);

  // Compute derived values from room state
  const whistData = room?.game_state || [];
  const players = room?.players || [];

  const whistTotals = players.map((_, playerIndex) =>
    whistData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );

  const whistActiveRoundIndex = whistData.findIndex(
    (r) => r.phase === "bidding" || r.phase === "tricks"
  );

  const whistIsComplete =
    whistData.length > 0 && whistData.every((r) => r.phase === "complete");

  // Loading state
  if (state === "loading") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-loading">Connecting to game...</div>
        </div>
      </div>
    );
  }

  // Not found state
  if (state === "not_found") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-error">
            <h2>Game not found</h2>
            <p>This game may have ended or the link is invalid.</p>
            <a href="/score-tracker" className="btn btn-primary">
              Back to Score Tracker
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-error">
            <h2>Connection error</h2>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected - render read-only ScoreTable
  return (
    <div className="screen score-tracker score-tracker-playing">
      <ScoreTable
        gameType="whist"
        players={players}
        teams={[]}
        rounds={[]}
        totals={[]}
        leaderIndex={-1}
        config={{ name: "Whist", minPlayers: 3, maxPlayers: 6 }}
        isTeamGame={false}
        // Whist-specific props
        whistData={whistData}
        whistTotals={whistTotals}
        whistActiveRoundIndex={whistActiveRoundIndex}
        whistIsComplete={whistIsComplete}
        // View-only mode
        isViewOnly={true}
        // Unused callbacks (view-only)
        onAddRound={() => {}}
        onUpdateRound={() => {}}
        onDeleteRound={() => {}}
        onUpdateWhistBids={() => {}}
        onUpdateWhistTricks={() => {}}
        onRevertWhistToBidding={() => {}}
        onReset={() => {}}
        onBackToMenu={() => {}}
      />
    </div>
  );
}
```

**Step 3: Verify page loads**

Visit `http://localhost:3000/score-tracker/whist/view/TEST` - should show "Game not found"

**Step 4: Commit**

```bash
git add src/app/score-tracker/whist/view/\[code\]/page.tsx
git commit -m "feat: add Whist viewer page for live spectating"
```

---

## Task 5: Update ScoreTable for View-Only Mode

**Files:**
- Modify: `src/games/score-tracker/components/ScoreTable.jsx`

**Step 1: Add isViewOnly prop**

At the top of the props destructuring (around line 8), add:

```javascript
export function ScoreTable({
  gameType,
  players,
  // ... existing props ...
  onBackToMenu,
  isViewOnly = false,  // ADD THIS
}) {
```

**Step 2: Update Whist header for view-only mode**

Replace the header section (around line 198-206) with:

```jsx
<div className="score-table-header">
  {!isViewOnly && (
    <button className="btn-back-menu" onClick={onBackToMenu}>
      &larr; Score Tracker
    </button>
  )}
  <span className="score-table-title">
    {config.name}
    {isViewOnly && <span className="live-badge">LIVE</span>}
  </span>
  {!isViewOnly && (
    <button className="btn-reset" onClick={onReset}>
      Reset
    </button>
  )}
</div>
```

**Step 3: Disable row clicks in view-only mode**

In the Whist row click handler (around line 292), update:

```jsx
onClick={() => !isViewOnly && isClickable && handleWhistRowClick(round, rowIndex)}
```

**Step 4: Hide action buttons in view-only mode**

Wrap the whist-status-bar action buttons section (around line 221-254) with:

```jsx
{!isViewOnly && whistActiveRoundIndex >= 0 && !whistIsComplete && (
  <div className="whist-action-buttons">
    {/* existing buttons */}
  </div>
)}
```

**Step 5: Hide export button for viewers**

Update the game complete section (around line 323-330):

```jsx
{whistIsComplete && (
  <div className="game-complete-message">
    <p>Winner: <strong>{players[whistLeaderIndex]}</strong> with {whistTotals[whistLeaderIndex]} points!</p>
    {!isViewOnly && (
      <button className="btn btn-export" onClick={handleExport}>
        Export Results
      </button>
    )}
  </div>
)}
```

**Step 6: Verify**

- Normal Whist game should still work with all controls
- Viewer page should show scores without any interactive elements

**Step 7: Commit**

```bash
git add src/games/score-tracker/components/ScoreTable.jsx
git commit -m "feat: add isViewOnly mode to ScoreTable"
```

---

## Task 6: Add Live Badge CSS

**Files:**
- Modify: `src/games/score-tracker/score-tracker.css`

**Step 1: Add live badge and viewer styles**

Add to end of file:

```css
/* Live View Badge */
.live-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fff;
  background: #e53e3e;
  border-radius: 4px;
  animation: pulse-live 2s ease-in-out infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Viewer Status Screens */
.viewer-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
}

.viewer-loading {
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.viewer-error {
  max-width: 400px;
}

.viewer-error h2 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.viewer-error p {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}
```

**Step 2: Commit**

```bash
git add src/games/score-tracker/score-tracker.css
git commit -m "feat: add live badge and viewer status styles"
```

---

## Task 7: Add Share Button to ScoreTable

**Files:**
- Modify: `src/games/score-tracker/components/ScoreTable.jsx`

**Step 1: Add share-related props**

Update props to include:

```javascript
export function ScoreTable({
  // ... existing props ...
  isViewOnly = false,
  // Share functionality (for hosts)
  shareUrl = null,
  onShare = null,
}) {
```

**Step 2: Add share button state**

After the existing useState declarations (around line 53-59), add:

```javascript
const [showShareModal, setShowShareModal] = useState(false);
```

**Step 3: Add Share button to header**

Update the Whist header section to include a share button:

```jsx
<div className="score-table-header">
  {!isViewOnly && (
    <button className="btn-back-menu" onClick={onBackToMenu}>
      &larr; Score Tracker
    </button>
  )}
  <span className="score-table-title">
    {config.name}
    {isViewOnly && <span className="live-badge">LIVE</span>}
  </span>
  <div className="header-actions">
    {!isViewOnly && shareUrl && (
      <button
        className="btn-share"
        onClick={() => setShowShareModal(true)}
        title="Share live view"
      >
        Share
      </button>
    )}
    {!isViewOnly && (
      <button className="btn-reset" onClick={onReset}>
        Reset
      </button>
    )}
  </div>
</div>
```

**Step 4: Add Share Modal**

Add before the closing div of the Whist section (before line 343):

```jsx
{showShareModal && shareUrl && (
  <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
    <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Share Live View</h3>
        <button className="modal-close" onClick={() => setShowShareModal(false)}>
          &times;
        </button>
      </div>
      <div className="modal-body">
        <p>Others can watch the scores update in real-time:</p>
        <div className="share-url-container">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="share-url-input"
            onClick={(e) => e.target.select()}
          />
          <button
            className="btn btn-copy"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              // Could add a "Copied!" toast here
            }}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/games/score-tracker/components/ScoreTable.jsx
git commit -m "feat: add Share button and modal to ScoreTable"
```

---

## Task 8: Add Share Modal CSS

**Files:**
- Modify: `src/games/score-tracker/score-tracker.css`

**Step 1: Add share-related styles**

Add to end of file:

```css
/* Header Actions */
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Share Button */
.btn-share {
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--accent);
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-share:hover {
  background: var(--accent);
  color: #fff;
}

/* Share Modal */
.share-modal {
  max-width: 450px;
  width: 90%;
}

.share-modal .modal-body p {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.share-url-container {
  display: flex;
  gap: 8px;
}

.share-url-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-family: monospace;
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
}

.share-url-input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn-copy {
  padding: 10px 16px;
  font-weight: 500;
  white-space: nowrap;
}
```

**Step 2: Commit**

```bash
git add src/games/score-tracker/score-tracker.css
git commit -m "feat: add share modal styles"
```

---

## Task 9: Integrate useWhistRoom in GamePage

**Files:**
- Modify: `src/games/score-tracker/components/GamePage.jsx`

**Step 1: Import the new hook**

Add import at top:

```javascript
import { useWhistRoom } from "../hooks/useWhistRoom";
```

**Step 2: Conditionally use the hook**

The tricky part: hooks must be called unconditionally. We'll call both hooks but only use useWhistRoom for Whist:

Replace the single useScoreTracker call with:

```javascript
// Use the live-enabled hook for Whist, regular hook for others
const whistRoom = useWhistRoom();
const regularTracker = useScoreTracker(gameType !== 'whist' ? gameType : null);

// Select which tracker to use based on game type
const tracker = gameType === 'whist' ? whistRoom : regularTracker;

// Destructure from the selected tracker
const {
  players,
  teams,
  rounds,
  whistData,
  phase,
  isLoaded,
  config,
  totals,
  leaderIndex,
  isTeamGame,
  whistTotals,
  whistActiveRoundIndex,
  whistIsComplete,
  // Rentz props...
  rentzData,
  rentzConfig,
  rentzTotals,
  rentzActiveRoundIndex,
  rentzIsComplete,
  rentzCurrentDealerIndex,
  rentzDealerGames,
  // General props...
  generalData,
  generalCurrentPlayer,
  generalTotals,
  generalLeaderIndex,
  generalCanUndo,
  // Actions
  startGame,
  startTeamGame,
  addRound,
  updateRound,
  deleteRound,
  updateWhistBids,
  updateWhistTricks,
  revertWhistToBidding,
  selectRentzMiniGame,
  updateRentzScores,
  revertRentzToSelecting,
  addGeneralScore,
  undoGeneralScore,
  editGeneralScore,
  deleteGeneralRound,
  newGame,
  GAME_CONFIG,
  RENTZ_MINI_GAMES,
  DEFAULT_RENTZ_CONFIG,
} = tracker;

// Live view props (only available for Whist with useWhistRoom)
const { shareUrl, roomCode, isLiveEnabled } = gameType === 'whist' ? whistRoom : { shareUrl: null, roomCode: null, isLiveEnabled: false };
```

**Step 3: Pass shareUrl to ScoreTable**

Update the ScoreTable component call to include:

```jsx
<ScoreTable
  // ... existing props ...
  shareUrl={shareUrl}
/>
```

**Step 4: Verify**

1. Start dev server
2. Log in as authenticated user
3. Start a Whist game
4. Should see "Share" button appear
5. Click Share - should show modal with URL
6. Copy URL and open in incognito - should see read-only view

**Step 5: Commit**

```bash
git add src/games/score-tracker/components/GamePage.jsx
git commit -m "feat: integrate useWhistRoom for live view support"
```

---

## Task 10: Final Testing & Polish

**Manual Testing Checklist:**

1. **Anonymous user flow:**
   - [ ] Start Whist game as anonymous user
   - [ ] Verify no Share button appears
   - [ ] Game works normally with localStorage

2. **Authenticated user flow:**
   - [ ] Log in
   - [ ] Start Whist game
   - [ ] Verify Share button appears
   - [ ] Click Share, copy URL
   - [ ] Open URL in another browser/incognito
   - [ ] Verify viewer sees current scores

3. **Real-time sync:**
   - [ ] As host, enter bids and tricks
   - [ ] Verify viewer sees updates in real-time
   - [ ] Complete a round, verify viewer updates

4. **Error handling:**
   - [ ] Visit invalid room code - should show "Game not found"
   - [ ] Host closes browser, viewer should still see last state

5. **Edge cases:**
   - [ ] Start new game (Reset) - share URL should update
   - [ ] Refresh viewer page - should reconnect

**Step 1: Fix any issues found during testing**

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete Whist live view implementation"
```

---

## Summary

After completing all tasks:

- Logged-in users hosting Whist get automatic Supabase sync
- Share button reveals a URL others can view
- Viewers see real-time score updates (read-only)
- Anonymous users continue using localStorage-only flow
- Foundation ready for Rentz, Septica, General expansion
