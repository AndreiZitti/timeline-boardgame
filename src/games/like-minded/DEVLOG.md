# Like Minded - Development Log

> Last Updated: February 2026

## Game Status: ~80% Complete

Like Minded is a Wavelength-style psychic guessing game. One player (psychic) sees where a target lands on a spectrum and gives a clue. The team guesses where on the spectrum the clue points to.

---

## File Structure

```
src/games/like-minded/
├── LikeMindedGame.jsx       # Main orchestrator, mode routing
├── index.js                 # Export wrapper
├── like-minded.css          # All styles
├── hooks/
│   ├── useGameState.js      # Single device state + localStorage
│   └── useWavelengthRoom.js # Multiplayer Supabase state
├── data/
│   └── spectrums.js         # 60 spectrum definitions
└── components/
    ├── Spectrum.jsx         # Reusable gauge with animation
    ├── Setup.jsx            # Single device player setup
    ├── PsychicScreen.jsx    # Psychic sees target, gives clue
    ├── GuessScreen.jsx      # Team guesses with slider
    ├── RevealScreen.jsx     # Shows target vs guess
    ├── ResultsScreen.jsx    # Final scores
    └── multiplayer/
        ├── RoomLobby.jsx    # Pre-game lobby with name input
        ├── PsychicView.jsx  # Multiplayer psychic screen
        ├── WaitingScreen.jsx# Non-psychics wait
        ├── GuesserView.jsx  # Team guessing
        ├── RevealView.jsx   # Multiplayer reveal
        └── EndScreen.jsx    # Final results
```

---

## Game Modes

### 1. Single Device Mode
Pass-and-play on one device. Each player takes turns as psychic.

### 2. Multiplayer Mode
Real-time via Supabase. One host, multiple players. Psychic rotates.

---

## Game Flow

**Single Device:**
```
Setup → [Psychic → Guess → Reveal] × N players → Results
```

**Multiplayer:**
```
Home (Create/Join inline) → Lobby (enter name) → [Psychic → Guess → Reveal] × N → End
```

**Streamlined Flow (Feb 2026):**
- Create Room: One click, instant room creation
- Join Room: Inline 4-letter code input on home screen
- Name Entry: Done in lobby (pre-filled if saved)
- Start: Requires all players to have names

**Phase Values:**
- Single: `'setup'` | `'psychic'` | `'guess'` | `'reveal'` | `'results'`
- Multi: `'lobby'` | `'psychic'` | `'guessing'` | `'reveal'` | `'end'`

---

## Scoring System

| Zone | Distance | Team Points | Game Points |
|------|----------|-------------|-------------|
| Bullseye | ≤5 | +4 | 0 |
| Close | ≤12 | +3 | 0 |
| Near | ≤20 | +2 | 0 |
| Miss | >20 | 0 | 1-4 |

---

## Features Implemented

### Single Device
- [x] Player setup (2-10 players)
- [x] Optional player names
- [x] Full game loop
- [x] Spectrum gauge with interactive slider
- [x] Target reveal animation (oscillating spin)
- [x] Score calculation
- [x] Round history tracking
- [x] Results screen
- [x] Play again
- [x] localStorage persistence

### Multiplayer
- [x] Room creation with 4-letter code
- [x] Room joining with validation
- [x] Supabase realtime sync
- [x] Host/guest distinction
- [x] Psychic rotation (round-robin)
- [x] Full game loop
- [x] Rejoin on page reload
- [x] Room cleanup on last leave

### Shared
- [x] 60 spectrum definitions
- [x] Animated gauge component
- [x] Framer Motion animations
- [x] Error handling

---

## Database Schema

**Table**: `games.likeminded_rooms`

| Field | Type | Description |
|-------|------|-------------|
| code | TEXT PK | Room code (4 letters) |
| phase | TEXT | Current game phase |
| current_psychic_id | UUID | Current psychic player |
| spectrum | JSONB | {id, left, right} |
| target | INTEGER | 0-100, null until game starts |
| clue | TEXT | Psychic's clue |
| guess | INTEGER | Team's guess (0-100) |
| team_score | INTEGER | Accumulated team points |
| game_score | INTEGER | Accumulated game points |
| players | JSONB | [{id, name}, ...] |
| used_spectrums | JSONB | Array of used spectrum IDs |
| metadata | JSONB | Reserved for extensions |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 4-letter codes | Easy to type, ~330k combinations |
| Exclude I/O from codes | Avoid confusion with 1/0 |
| Oscillating reveal animation | Creates suspense |
| Zone-based scoring | Simple, fair, familiar from Wavelength |
| Round-robin psychic | Everyone gets a turn |
| localStorage persistence | Resume interrupted games |

---

## Potential Improvements

### Not Started
1. **Round Limits** - Option for max rounds
2. **Difficulty Settings** - Vary target range
3. **Game Statistics** - Track wins/losses to DB
4. **Multiplayer Voting** - All players vote on guess
5. **Spectator Mode** - Watch without playing
6. **Round History in Multiplayer** - Show past rounds at end

### Known Quirks
- Multiplayer guessing: Last person to lock in wins (race condition)
- No clue content validation (could submit whitespace)
- Room persists after game ends (no auto-cleanup)

---

## Integration Points

- **UserContext**: Player identity (id, name)
- **Supabase**: `games.likeminded_rooms` table, realtime
- **Framer Motion**: Animations throughout

---

## Spectrum Component

The `Spectrum.jsx` component has 3 modes:
- **reveal**: Animated spin → settle on target
- **interactive**: Slider for guessing
- **display**: Static display of result

Animation sequence:
1. Oscillation (3 cycles, ~3.6s)
2. Settle to target (800ms, cubic ease)
3. Callback fires

---

## Development Notes

### When Adding Features
1. Update relevant hook (`useGameState` or `useWavelengthRoom`)
2. Add/modify component
3. Wire up in `LikeMindedGame.jsx`
4. Update `like-minded.css`

### Testing Multiplayer
- Open multiple browser tabs
- Use different incognito windows for different players
- Check Supabase realtime logs

### Debugging
- Room state in React DevTools
- localStorage key: `wavelengthRoomCode` (multiplayer)
- localStorage key: `like-minded-single-game` (single device)

---

## Changelog

### Feb 2026 - Streamlined Lobby Flow
- Removed `CreateRoom.jsx` and `JoinRoom.jsx` components
- Create Room now instant (one click)
- Join Room via inline 4-letter code input on home screen
- Name entry moved to lobby (pre-filled if saved in localStorage)
- Start button disabled until all players have names
- Initial documentation created
