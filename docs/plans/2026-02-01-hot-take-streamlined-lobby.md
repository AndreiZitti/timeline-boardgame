# Hot Take: Streamlined Lobby Flow

> Date: 2026-02-01

## Goal

Reduce clicks to start a game by:
1. Removing separate Create/Join screens
2. Moving name entry into the lobby
3. Making room creation instant

## New Flow

**Host:** Home → [Create Room] → Lobby (instant)

**Join:** Home → [type code + Enter] → Lobby

Both flows land in the same Lobby - no modals, no intermediate screens.

## Home Screen

```
┌─────────────────────────────────────────────┐
│           HOT TAKE                          │
│                                             │
│     [ Create Room ]                         │
│                                             │
│     [ _____ ] → Join                        │
│     (enter code, press Enter or →)          │
│                                             │
│     [ Single Device ]                       │
└─────────────────────────────────────────────┘
```

- Create Room: instant, no prompts
- Join: inline code input + arrow/Enter to submit
- Removes CreateRoom and JoinRoom screens

## Lobby Layout

```
┌─────────────────────────────────────────────┐
│  ← Leave                        Room: AB3CD │
├─────────────────────────────────────────────┤
│  Your Name: [_______________] (pre-filled)  │
├─────────────────────────────────────────────┤
│  PLAY MODE (host only)                      │
│  [ Table ]  [ Remote ]                      │
├─────────────────────────────────────────────┤
│  CATEGORY (host only)                       │
│  [_______________] [Browse] [Random]        │
├─────────────────────────────────────────────┤
│  PLAYERS (3)                                │
│  • Alice (Host) ✓                           │
│  • Bob ✓                                    │
│  • ??? (entering name...)                   │
├─────────────────────────────────────────────┤
│         [Start Round]                       │
│   (disabled until all players have names)   │
└─────────────────────────────────────────────┘
```

Key behaviors:
- Name field at top, pre-filled from localStorage if saved
- Checkmark next to players who have entered names
- Players without names show as "??? (entering name...)"
- Host controls visible to all, editable by host only
- Start disabled until: 2+ players AND all named AND category set

## Implementation Changes

### Files to Modify

1. **`HotTakeGame.jsx`**
   - Remove `'create'` and `'join'` screen states
   - Add inline join input to home screen
   - Add `joinCode` state

2. **`hooks/useRoom.js`**
   - `createRoom()` - No name param, uses saved name or empty
   - `joinRoom(code)` - No name param
   - Add `updateMyName(name)` function

3. **`components/Lobby.jsx`**
   - Add name input section at top
   - Show ✓ for named players, "???" for unnamed
   - Update `canStart` logic

### Files to Delete

- `components/CreateRoom.jsx`
- `components/JoinRoom.jsx`

### Database

No schema changes needed - players array already supports empty names.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Player joins with saved name | Pre-filled, appears with ✓ |
| Player joins without saved name | Shows as "???", must enter name |
| Player changes name mid-lobby | Real-time update for everyone |
| Host starts with unnamed player | Button disabled |
| All named but no category | Button disabled |
