# Account Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track game/tracker results per user and show 4 trackers as separate cards in the hub.

**Architecture:** Two new Supabase tables (game_results, tracker_results) with UserContext functions to record results. GameHub gets a "Trackers" tab with 4 cards. Profile modal shows stats summary + recent activity.

**Tech Stack:** Next.js, Supabase, TypeScript, React

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/003_game_results.sql`

**Step 1: Create migration file**

```sql
-- Game results for party games (Hot Take, Like Minded, Quiz, etc.)
create table games.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null,
  played_at timestamptz not null default now(),
  players_count integer,
  won boolean,
  was_host boolean default false
);

create index game_results_user_id_idx on games.game_results(user_id);
create index game_results_played_at_idx on games.game_results(played_at desc);

-- Tracker results for card games (Septica, Whist, Rentz, General)
create table games.tracker_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracker_type text not null,
  played_at timestamptz not null default now(),
  players jsonb not null,
  scores jsonb not null,
  winner_index integer
);

create index tracker_results_user_id_idx on games.tracker_results(user_id);
create index tracker_results_played_at_idx on games.tracker_results(played_at desc);

-- Enable RLS
alter table games.game_results enable row level security;
alter table games.tracker_results enable row level security;

-- Users can only see/insert their own results
create policy "Users can view own game results"
  on games.game_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own game results"
  on games.game_results for insert
  with check (auth.uid() = user_id);

create policy "Users can view own tracker results"
  on games.tracker_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracker results"
  on games.tracker_results for insert
  with check (auth.uid() = user_id);
```

**Step 2: Apply migration to Supabase**

Run this SQL in your Supabase SQL editor or via CLI.

**Step 3: Commit**

```bash
git add supabase/migrations/003_game_results.sql
git commit -m "feat: add game_results and tracker_results tables"
```

---

## Task 2: Update GameHub - Trackers Tab

**Files:**
- Modify: `src/components/GameHub.tsx`

**Step 1: Replace tools array with trackers array**

Find the `tools` array (lines 67-76) and replace with:

```typescript
const trackers: Item[] = [
  {
    id: "septica",
    name: "Septica",
    description: "Track Septica card game scores.",
    available: true,
    accent: "#f59e0b",
    href: "/score-tracker/septica",
  },
  {
    id: "whist",
    name: "Whist",
    description: "Track Whist card game scores.",
    available: true,
    accent: "#8b5cf6",
    href: "/score-tracker/whist",
  },
  {
    id: "rentz",
    name: "Rentz",
    description: "Track Rentz card game scores.",
    available: true,
    accent: "#ec4899",
    href: "/score-tracker/rentz",
  },
  {
    id: "general",
    name: "General",
    description: "Track any game's scores.",
    available: true,
    accent: "#6b7280",
    href: "/score-tracker/general",
  },
];
```

**Step 2: Update state and tab labels**

Change the `activeTab` state type from `"games" | "tools"` to `"games" | "trackers"`:

```typescript
const [activeTab, setActiveTab] = useState<"games" | "trackers">("games");

const items = activeTab === "games" ? games : trackers;
const title = activeTab === "games" ? "Party Games" : "Trackers";
const subtitle = activeTab === "games"
  ? "Choose a game to play with friends"
  : "Track scores for card games";
```

**Step 3: Update tab button**

Change the Tools tab button (around line 151-157):

```typescript
<button
  className={`hub-tab ${activeTab === "trackers" ? "active" : ""}`}
  onClick={() => setActiveTab("trackers")}
>
  <span className="hub-tab-icon">🃏</span>
  <span className="hub-tab-label">Trackers</span>
</button>
```

**Step 4: Commit**

```bash
git add src/components/GameHub.tsx
git commit -m "feat: replace Tools with Trackers tab showing 4 card game trackers"
```

---

## Task 3: Add Recording Functions to UserContext

**Files:**
- Modify: `src/contexts/UserContext.tsx`

**Step 1: Add new types after existing interfaces (around line 30)**

```typescript
interface GameResult {
  gameType: string;
  playersCount?: number;
  won?: boolean;
  wasHost?: boolean;
}

interface TrackerResult {
  trackerType: string;
  players: string[];
  scores: number[];
  winnerIndex?: number;
}

interface ActivityItem {
  id: string;
  type: 'game' | 'tracker';
  name: string;       // game_type or tracker_type
  playedAt: string;
  // For games:
  playersCount?: number;
  won?: boolean;
  // For trackers:
  players?: string[];
  scores?: number[];
  winnerIndex?: number;
}
```

**Step 2: Add new functions to UserContextType interface**

Add after `incrementGamesHosted`:

```typescript
recordGameResult: (result: GameResult) => Promise<void>;
recordTrackerResult: (result: TrackerResult) => Promise<void>;
getRecentActivity: (limit?: number) => Promise<ActivityItem[]>;
```

**Step 3: Add localStorage helpers for activity (after existing localStorage helpers, ~line 74)**

```typescript
function getLocalActivity(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("recentActivity") || "[]");
  } catch {
    return [];
  }
}

function addLocalActivity(item: ActivityItem) {
  if (typeof window === "undefined") return;
  const activity = getLocalActivity();
  activity.unshift(item);
  // Keep only last 50 items
  localStorage.setItem("recentActivity", JSON.stringify(activity.slice(0, 50)));
}
```

**Step 4: Add recordGameResult function inside UserProvider (after updateStats)**

```typescript
const recordGameResult = useCallback(
  async (result: GameResult) => {
    const activityItem: ActivityItem = {
      id: crypto.randomUUID(),
      type: 'game',
      name: result.gameType,
      playedAt: new Date().toISOString(),
      playersCount: result.playersCount,
      won: result.won,
    };

    // Always save locally
    addLocalActivity(activityItem);

    // Update aggregate stats
    const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
    if (result.wasHost) {
      newStats.gamesHosted = stats.gamesHosted + 1;
    }
    await updateStats(newStats);

    // If authenticated, also save to Supabase
    if (user) {
      await supabase.schema("games").from("game_results").insert({
        user_id: user.id,
        game_type: result.gameType,
        players_count: result.playersCount,
        won: result.won,
        was_host: result.wasHost ?? false,
      });
    }
  },
  [user, supabase, stats, updateStats]
);
```

**Step 5: Add recordTrackerResult function after recordGameResult**

```typescript
const recordTrackerResult = useCallback(
  async (result: TrackerResult) => {
    const activityItem: ActivityItem = {
      id: crypto.randomUUID(),
      type: 'tracker',
      name: result.trackerType,
      playedAt: new Date().toISOString(),
      players: result.players,
      scores: result.scores,
      winnerIndex: result.winnerIndex,
    };

    // Always save locally
    addLocalActivity(activityItem);

    // Update aggregate stats (count as game played)
    const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
    await updateStats(newStats);

    // If authenticated, also save to Supabase
    if (user) {
      await supabase.schema("games").from("tracker_results").insert({
        user_id: user.id,
        tracker_type: result.trackerType,
        players: result.players,
        scores: result.scores,
        winner_index: result.winnerIndex,
      });
    }
  },
  [user, supabase, stats, updateStats]
);
```

**Step 6: Add getRecentActivity function after recordTrackerResult**

```typescript
const getRecentActivity = useCallback(
  async (limit: number = 10): Promise<ActivityItem[]> => {
    if (!user) {
      // Return from localStorage for guests
      return getLocalActivity().slice(0, limit);
    }

    // Fetch from both tables and merge
    const [gameRes, trackerRes] = await Promise.all([
      supabase
        .schema("games")
        .from("game_results")
        .select("id, game_type, played_at, players_count, won")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(limit),
      supabase
        .schema("games")
        .from("tracker_results")
        .select("id, tracker_type, played_at, players, scores, winner_index")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(limit),
    ]);

    const gameItems: ActivityItem[] = (gameRes.data || []).map((r) => ({
      id: r.id,
      type: 'game' as const,
      name: r.game_type,
      playedAt: r.played_at,
      playersCount: r.players_count,
      won: r.won,
    }));

    const trackerItems: ActivityItem[] = (trackerRes.data || []).map((r) => ({
      id: r.id,
      type: 'tracker' as const,
      name: r.tracker_type,
      playedAt: r.played_at,
      players: r.players,
      scores: r.scores,
      winnerIndex: r.winner_index,
    }));

    // Merge and sort by date
    return [...gameItems, ...trackerItems]
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, limit);
  },
  [user, supabase]
);
```

**Step 7: Add new functions to context provider value**

Update the return statement to include:

```typescript
recordGameResult,
recordTrackerResult,
getRecentActivity,
```

**Step 8: Commit**

```bash
git add src/contexts/UserContext.tsx
git commit -m "feat: add result recording and activity fetching to UserContext"
```

---

## Task 4: Update Profile Modal

**Files:**
- Modify: `src/components/Profile.tsx`

**Step 1: Add imports and state for activity**

At the top, update the useUser import and add useEffect:

```typescript
import { useState, useEffect } from "react";
```

Add inside the component after existing state:

```typescript
const {
  user,
  isAuthenticated,
  isLoading,
  signIn,
  signOut,
  profile,
  updateName,
  getRecentActivity,
} = useUser();

// Add after existing state declarations
const [recentActivity, setRecentActivity] = useState<Array<{
  id: string;
  type: 'game' | 'tracker';
  name: string;
  playedAt: string;
  playersCount?: number;
  won?: boolean;
  players?: string[];
  scores?: number[];
  winnerIndex?: number;
}>>([]);

useEffect(() => {
  if (isOpen) {
    getRecentActivity(5).then(setRecentActivity);
  }
}, [isOpen, getRecentActivity]);
```

**Step 2: Add helper function for formatting activity**

Add before the return statement:

```typescript
const formatActivityItem = (item: typeof recentActivity[0]) => {
  const date = new Date(item.playedAt);
  const isToday = date.toDateString() === new Date().toDateString();
  const dateStr = isToday ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (item.type === "game") {
    const parts = [item.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")];
    if (item.playersCount) parts.push(`${item.playersCount} players`);
    if (item.won === true) parts.push("won");
    if (item.won === false) parts.push("lost");
    return { text: parts.join(" - "), date: dateStr };
  } else {
    // Tracker: show condensed scores
    const name = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    if (item.players && item.scores) {
      const scoreStr = item.players.map((p, i) => `${p} ${item.scores![i]}`).join(", ");
      return { text: `${name}: ${scoreStr}`, date: dateStr };
    }
    return { text: name, date: dateStr };
  }
};
```

**Step 3: Update stats section to show wins and tracker games**

Replace the existing stats-grid div (lines 114-123):

```typescript
<div className="stats-grid">
  <div className="stat-item">
    <span className="stat-value">{profile.gamesPlayed || 0}</span>
    <span className="stat-label">Games</span>
  </div>
  <div className="stat-item">
    <span className="stat-value">{profile.gamesHosted || 0}</span>
    <span className="stat-label">Hosted</span>
  </div>
</div>
```

**Step 4: Add recent activity section after stats section**

Add after the `</div>` that closes `profile-stats`:

```typescript
{recentActivity.length > 0 && (
  <div className="profile-activity">
    <h3>Recent Activity</h3>
    <ul className="activity-list">
      {recentActivity.map((item) => {
        const formatted = formatActivityItem(item);
        return (
          <li key={item.id} className="activity-item">
            <span className="activity-icon">{item.type === 'game' ? '🎮' : '🃏'}</span>
            <span className="activity-text">{formatted.text}</span>
            <span className="activity-date">{formatted.date}</span>
          </li>
        );
      })}
    </ul>
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/components/Profile.tsx
git commit -m "feat: show recent activity in profile modal"
```

---

## Task 5: Add Activity Styles

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add activity list styles**

Add at the end of the file:

```css
/* Profile Activity */
.profile-activity {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.profile-activity h3 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border-light);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  flex-shrink: 0;
}

.activity-text {
  flex: 1;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-date {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add activity list styles to profile"
```

---

## Task 6: Integrate Recording into Score Tracker

**Files:**
- Modify: `src/games/score-tracker/components/ScoreTable.jsx`

**Step 1: Import useUser at the top**

```javascript
import { useUser } from "@/contexts/UserContext";
```

**Step 2: Get recordTrackerResult from hook**

Add inside the component:

```javascript
const { recordTrackerResult } = useUser();
```

**Step 3: Add save function and button**

Add a function to save results and a button in the UI that calls it when the game ends. The exact placement depends on the ScoreTable structure - add near any "End Game" or completion logic:

```javascript
const handleSaveGame = () => {
  recordTrackerResult({
    trackerType: gameType, // 'septica', 'whist', 'rentz', 'general'
    players: players.map(p => p.name),
    scores: players.map(p => p.total || p.score || 0),
    winnerIndex: players.reduce((maxIdx, p, i, arr) =>
      (p.total || p.score || 0) > (arr[maxIdx].total || arr[maxIdx].score || 0) ? i : maxIdx, 0),
  });
};
```

Note: Exact integration depends on ScoreTable props/state. The gameType should come from a prop.

**Step 4: Commit**

```bash
git add src/games/score-tracker/components/ScoreTable.jsx
git commit -m "feat: integrate tracker result recording in ScoreTable"
```

---

## Task 7: Final Commit

**Step 1: Test the flow**

1. Open the app
2. Switch to "Trackers" tab - should see 4 cards
3. Open a tracker, play a game, save it
4. Open Profile - should see recent activity

**Step 2: Final commit if needed**

```bash
git add -A
git commit -m "chore: finalize account tracking implementation"
```

---

## Summary

| Task | Description | Est. Lines |
|------|-------------|------------|
| 1 | Database migration | 40 |
| 2 | GameHub trackers tab | 25 |
| 3 | UserContext recording functions | 120 |
| 4 | Profile modal activity | 50 |
| 5 | Activity CSS | 40 |
| 6 | ScoreTable integration | 15 |
