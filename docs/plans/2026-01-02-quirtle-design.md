# QUIRTLE Game Design

## Overview

QUIRTLE is a tile-matching strategy game for 2-4 players. Players take turns placing tiles on a shared board, matching either colors or shapes to form lines and score points.

## Core Rules

### Tiles & Setup
- **108 total tiles**: 6 shapes × 6 colors × 3 copies each
- **Shapes**: Circle, Square, Diamond, Star, Cross, Triangle (placeholder - may replace with images)
- **Colors**: Red, Orange, Yellow, Green, Blue, Purple
- Each player draws 6 tiles from a shuffled bag

### Placement Rules
- Tiles must be placed adjacent to existing tiles (orthogonally, not diagonal)
- All tiles in a line must share EITHER the same color OR the same shape
- No duplicates allowed in a line (can't have two red circles in the same line)
- On your turn, you can place multiple tiles - but all must extend a single row or column
- First player places freely in the center of the board

### Turn Structure
1. Current player sees their 6 tiles and the board
2. Player selects tiles from hand and places them on valid positions
3. If valid placement: score calculated, tiles drawn to refill hand to 6
4. If no valid move possible: player swaps any number of tiles with bag, turn skipped
5. Turn passes to next player (clockwise)

### Scoring
- Score = total tiles in each line you create/extend
- If a tile connects two lines, score both lines
- Completing a line of 6 (a "Qwirkle") = 6 points + 6 bonus = 12 points
- Ending the game = +12 point "Quirtle" bonus

### End Conditions
- Bag becomes empty AND a player places their last tile
- That player receives +12 Quirtle bonus
- No penalty for leftover tiles in hand

## Technical Architecture

### Database Schema

New Supabase table: `games.quirtle_rooms`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | text | 5-char room code |
| created_at | timestamptz | Creation time |
| phase | text | 'lobby' \| 'playing' \| 'ended' |
| players | jsonb | Array of `{id, name, hand: [], score: 0}` |
| host_id | text | Player ID of host |
| board | jsonb | `{tiles: [{x, y, shape, color}]}` |
| bag | jsonb | Array of remaining tiles |
| current_player_index | int | Index of current player |
| turn_number | int | Current turn number |

### File Structure

```
src/games/quirtle/
├── QuirtleGame.jsx        # Main entry component
├── quirtle.css            # Game styles
├── hooks/useQuirtleRoom.js # Room state & Supabase logic
├── components/
│   ├── CreateRoom.jsx
│   ├── JoinRoom.jsx
│   ├── Lobby.jsx
│   ├── GameBoard.jsx      # The tile grid
│   ├── PlayerHand.jsx     # Current player's tiles
│   └── ScoreBoard.jsx
└── utils/
    ├── tiles.js           # Tile generation, shuffling
    └── validation.js      # Placement & scoring logic
```

### Realtime Sync
- Same pattern as Hot Take / Like Minded
- Subscribe to room changes via Supabase realtime
- All game state lives in the database (single source of truth)

## MVP Scope

### Build First
- Create room / Join room with room code
- Lobby: see players, host can start (2-4 players)
- Game board: infinite grid with pan/scroll
- Player hand: display 6 tiles, select tiles to place
- Valid placement highlighting (show where tiles can go)
- Turn-based play with automatic draw from bag
- Scoring: calculate and display after each turn
- Swap tiles action when no valid moves
- Game end detection + final scoreboard
- Play again option

### Deferred (Post-MVP)
- Spectator mode
- Game history / replay
- Custom tile images/themes
- Sound effects
- Animations (tile placement, scoring)
- Mobile touch gestures (pinch zoom)
- AI opponent
- Timer per turn
- Undo last move

### Not Building
- Single device pass-and-play (multiplayer only)
- Tournament/ranking system
- Chat

## Implementation Phases

### Phase 1: Foundation
- Create Supabase migration for `games.quirtle_rooms` table
- Set up file structure and basic components
- Add game to GameHub.tsx
- Create room hook with create/join/subscribe logic

### Phase 2: Lobby
- CreateRoom and JoinRoom components
- Lobby component showing players
- Host can start game (min 2 players)

### Phase 3: Core Game Logic
- Tile generation (108 tiles, shuffle, deal hands)
- Board data structure and rendering
- Placement validation (adjacency, line rules, no duplicates)
- Scoring calculation

### Phase 4: Gameplay UI
- GameBoard with infinite grid + pan/scroll
- PlayerHand with tile selection
- Valid placement indicators
- Turn management and player switching
- Swap tiles flow

### Phase 5: End Game
- End condition detection
- Final scoreboard
- Quirtle bonus (+12)
- Play again functionality
