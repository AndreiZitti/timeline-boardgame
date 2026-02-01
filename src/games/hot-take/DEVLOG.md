# Hot Take - Development Log

> Last Updated: February 2026

## Game Status: ~85% Complete

Hot Take is a party game where players get secret numbers 1-100 and must describe where they stand on a spectrum (category). Other players arrange everyone in order based on their descriptions.

---

## File Structure

```
src/games/hot-take/
├── HotTakeGame.jsx      # Main orchestrator (screen routing, state coordination)
├── index.js             # Export wrapper
├── hot-take.css         # All styles
├── hooks/
│   └── useRoom.js       # Supabase state management
└── components/
    ├── Lobby.jsx        # Pre-game lobby with name input, category picker
    ├── NumberReveal.jsx # Shows player's number (table mode)
    ├── HiddenScreen.jsx # Number hidden state (table mode)
    ├── RevealScreen.jsx # Results display
    ├── GameBoard.jsx    # Virtual board (remote mode)
    ├── SingleDeviceSetup.jsx    # Single device config
    ├── PassAndPlay.jsx          # Pass device between players
    └── SingleDeviceBoard.jsx    # Local board arrangement
```

---

## Game Modes

### 1. Multiplayer - Table Mode
Players use their phones to see numbers, then **physically** arrange themselves. Host reveals when ready.

### 2. Multiplayer - Remote Mode
Virtual board with drag-drop slots. All players see shared board state via Supabase realtime.

### 3. Single Device Mode
Pass-and-play on one device. No network required.

---

## Game Flow

```
HOME (Create/Join inline) → LOBBY (enter name) → PLAYING → REVEALED → LOBBY (new round)
                                                    ↓
                              Table Mode: NumberReveal ↔ HiddenScreen
                              Remote Mode: GameBoard with drag-drop
```

**Streamlined Flow (Feb 2026):**
- Create Room: One click, instant room creation
- Join Room: Inline code input on home screen, press Enter to join
- Name Entry: Done in lobby (pre-filled if saved)
- Start: Requires all players to have names

**Phase Values**: `'lobby'` | `'playing'` | `'revealed'`

---

## Features Implemented

- [x] Room creation with unique codes (4 letters + 1 digit)
- [x] Room joining via code (inline input on home screen)
- [x] URL parameter sharing (`?room=CODE`)
- [x] localStorage room persistence
- [x] Supabase realtime sync
- [x] Seeded RNG for deterministic number assignment
- [x] Category system (300+ categories in 3 groups)
- [x] Category picker with group filters
- [x] Random category button
- [x] Custom category input
- [x] Table mode (physical arrangement)
- [x] Remote mode (virtual board)
- [x] Single device pass-and-play
- [x] Drag-drop with slot swapping
- [x] Results display with rankings
- [x] Player stats tracking (played/hosted)
- [x] Auto-rejoin from URL/localStorage
- [x] Host controls
- [x] Leave room cleanup
- [x] Animations (title entry, heat sweep, fade-up)
- [x] Streamlined lobby flow (name entry in lobby, not before)
- [x] All players must have names before starting

---

## Database Schema

**Table**: `games.hottake_rooms`

| Field | Type | Description |
|-------|------|-------------|
| code | TEXT PK | Room code (5 chars) |
| phase | TEXT | Current game phase |
| round | INTEGER | Round number (starts at 1) |
| category | TEXT | Active category |
| mode | TEXT | 'table' or 'remote' |
| players | JSONB | Array of player objects |
| metadata | JSONB | Reserved for extensions |
| created_at | TIMESTAMPTZ | Auto timestamp |

**Player Object**:
```javascript
{
  id: "uuid",           // From UserContext
  name: "Player Name",
  number: null | 1-100, // Assigned at round start
  hidden: boolean,      // Toggle visibility
  confirmed: boolean,   // Reserved (unused)
  slot: null | 0-n      // Board position (remote mode)
}
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Seeded RNG (`seedrandom`) | Deterministic numbers - all clients compute same values |
| JSONB players array | Flexible, no schema migrations needed |
| Room code = 5 chars | ~3.3M combinations, easy to type |
| Phase machine | Clear state transitions, prevents invalid actions |
| Table vs Remote modes | Low-tech (physical) vs high-tech (virtual) options |
| Single Device local only | No latency, works offline |

---

## Potential Improvements

### Not Started
1. **Scoring/Elo System** - Track accuracy over time
2. **Save Custom Categories** - Persist user categories to DB
3. **Replay System** - Review previous rounds
4. **Player Lock-In** - Use `confirmed` field for ready state
5. **Rich Descriptions** - Show hints during reveal

### Reserved Schema Fields (Unused)
- `players[].confirmed` - Designed for lock-in feature
- `metadata` - Extensible JSON for future settings

---

## Integration Points

- **UserContext**: Player identity, stats tracking
- **Supabase**: `games.hottake_rooms` table, realtime subscriptions
- **Next.js Router**: Navigation, URL params

---

## Known Issues

None currently tracked. Game is stable.

---

## Category Groups

| Group | Count | Description |
|-------|-------|-------------|
| Safe | ~100 | Family-friendly topics |
| NSFW | ~100 | Adult content |
| Classic | ~20 | Simple scales (hot to cold, etc.) |

Categories are defined inline in `Lobby.jsx` and `SingleDeviceSetup.jsx`.

---

## Stats Tracking

- **Games Played**: Incremented when phase → 'revealed' (non-host)
- **Games Hosted**: Incremented when host calls `startRound()`

Stats sync to UserContext → localStorage (guest) or Supabase (authenticated).

---

## CSS Architecture

- Uses CSS variables for theming
- Dark mode ready (`--bg-*` variables)
- Key animations: `titleEntry`, `heatSweep`, `fadeUp`, `bulletPulse`
- Responsive grid layout

---

## Development Notes

### When Adding Features
1. Update `useRoom.js` for new state/actions
2. Add component in `components/`
3. Wire up in `HotTakeGame.jsx` screen router
4. Update `hot-take.css` for styling

### Testing Multiplayer
- Open multiple browser tabs/incognito windows
- Use `?room=CODE` URL to join same room
- Check Supabase realtime logs for sync issues

### Debugging
- Room state visible in React DevTools
- Supabase dashboard shows realtime events
- localStorage key: `roomCode`

---

## Changelog

### Feb 2026 - Streamlined Lobby Flow
- Removed `CreateRoom.jsx` and `JoinRoom.jsx` components
- Create Room now instant (one click)
- Join Room via inline code input on home screen
- Name entry moved to lobby (pre-filled if saved in localStorage)
- Start button disabled until all players have names
- Single device mode: category resets each round (was persisting)
