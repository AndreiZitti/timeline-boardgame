# Quiz Game - Lobby Redesign

## Overview

Simplify the quiz game flow by removing intermediate screens and consolidating all configuration into the Lobby.

## New Flow

### Host Flow
```
Home → [Create Room] → Lobby (room created instantly)
```

### Join Flow
```
Home → [Join Room] → Enter code → Lobby
       (or via link)
```

Both flows land in the same Lobby - no modals, no intermediate screens.

## Lobby Layout

```
┌─────────────────────────────────────────────┐
│  ← Back                         Room: ABCD  │
├─────────────────────────────────────────────┤
│  Your Name: [_______________] (pre-filled)  │
├─────────────────────────────────────────────┤
│  GAME TYPE (host only)                      │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ ⚡ Quick    │  │ 📋 Classic  │           │
│  │   Game     │  │    Game     │           │
│  └─────────────┘  └─────────────┘           │
├─────────────────────────────────────────────┤
│  CATEGORY (host only)                       │
│  [Mixed ●] [Science] [History] [Entertain.] │
├─────────────────────────────────────────────┤
│  PLAYERS (2)                                │
│  • Alice (Host) ✓                           │
│  • Bob ✓                                    │
│  • ??? (entering name...)                   │
├─────────────────────────────────────────────┤
│  [🔗 Copy Invite Link]                      │
│                                             │
│  [Start Game] (disabled until all named)    │
└─────────────────────────────────────────────┘
```

### Key Behaviors

- Name field pre-fills from localStorage if available
- Player appears in list with ✓ once name is entered
- Players without names show as "??? (entering name...)"
- Non-hosts see game type + category but can't change them
- Start button only enabled when all players have names
- Auto-submit name on load if pre-filled from localStorage

## Game Modes

### Quick Game
- 10 rounds of wagering → answering → reveal
- Each player wagers 1-10 points per round (each box usable once)
- Open-ended questions

### Classic Game
- 5×5 Jeopardy-style board
- Players pick questions by category and value
- First correct answer gets full points, others get half

## Categories

- **Mixed** (default) - Random questions from all categories
- Science
- History
- Entertainment
- Language
- Random

## Implementation Changes

### Files to Modify

| File | Change |
|------|--------|
| `QuizGame.jsx` | Remove `screen` state machine, simplify to Home → Lobby |
| `components/Setup.jsx` | Delete (no longer needed) |
| `components/Lobby.jsx` | Add: name input, game type cards, category pills |
| `components/JoinRoom.jsx` | Simplify to just code entry, then redirect to Lobby |
| `hooks/useQuizRoom.js` | Update `createRoom()`, `joinRoom()`, add `setPlayerName()` |

### Hook Changes (`useQuizRoom.js`)

- `createRoom()` - Creates room with host as unnamed player initially
- `joinRoom(code)` - Joins room with unnamed player  
- `setPlayerName(name)` - New action: updates current player's name
- `setGameMode(mode)` - New action: updates game mode (host only)
- `setCategory(category)` - New action: updates category (host only)
- `startGame()` - Validates all players have names before proceeding

### Database

No schema changes needed - players array already has `name` field, it can be empty/null initially.

## Edge Cases

1. **Empty name** - Field must have at least 1 character to confirm
2. **Player leaves before entering name** - Remove from players array
3. **Host leaves** - First remaining player becomes host
4. **Duplicate names** - Allowed (players identified by ID)
5. **Changing name** - Allowed until game starts
6. **Pre-filled name** - Auto-submit on load if localStorage has saved name
