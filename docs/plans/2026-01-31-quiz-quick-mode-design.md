# Quiz Quick Mode - Design Document

**Date:** 2026-01-31  
**Status:** Approved

## Overview

Quick Mode is a 10-round trivia game where players strategically allocate numbered "boxes" (1-10) as wagers before seeing each question. Each box can only be used once, creating resource management decisions alongside trivia knowledge.

## Game Flow

### Setup
- 10 rounds with 10 randomly selected questions (one per round)
- Each player receives boxes numbered 1-10
- Score starts at 0 for all players
- Categories are pre-selected randomly (one category per round)

### Round Structure

```
┌─────────────────────────────────────────────────────────┐
│  1. CATEGORY REVEAL                                     │
│     - Random category shown to all players              │
│     - Question NOT yet visible                          │
├─────────────────────────────────────────────────────────┤
│  2. WAGERING PHASE                                      │
│     - Players select one of their remaining boxes       │
│     - Wagers are VISIBLE to all in real-time            │
│     - Players can change wager until they lock in       │
│     - Phase ends when all players have locked in        │
├─────────────────────────────────────────────────────────┤
│  3. QUESTION PHASE                                      │
│     - Question revealed to all                          │
│     - Timer starts (same as classic mode)               │
│     - Players submit answers                            │
├─────────────────────────────────────────────────────────┤
│  4. REVEAL PHASE                                        │
│     - Correct answer shown                              │
│     - Correct = gain wagered box value as points        │
│     - Wrong = gain nothing (no penalty)                 │
│     - Used box is removed from player's pool            │
└─────────────────────────────────────────────────────────┘
```

### End Game
- After 10 rounds, all boxes are used
- Final scores displayed
- Winner determined by highest score
- Maximum possible score: 55 (1+2+3+...+10, all correct)

## Data Model Changes

### Player Object (Quick Mode)

```javascript
{
  id: "uuid",
  name: "Player Name",
  score: 0,
  // Quick mode specific:
  availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  currentWager: null,      // box number being wagered this round
  wagerLocked: false,      // has player locked in their wager?
  hasAnswered: false
}
```

### Room Object Changes

```javascript
{
  code: "ABCD1",
  phase: "lobby" | "wagering" | "answering" | "reveal" | "ended",
  game_mode: "quick",
  round_number: 1,         // 1-10
  current_question: {
    index: 0,
    category: "Science",   // shown during wagering
    started_at: null,      // set when question revealed
    submissions: []
  },
  // ... rest unchanged
}
```

## New Phase: "wagering"

The wagering phase is new to quick mode:

1. **Entry:** Triggered when round starts
2. **Display:** Category name + players' available boxes + wager selections
3. **Interaction:** Players click a box to select, click "Lock In" to confirm
4. **Real-time updates:** All wager selections visible immediately via Supabase realtime
5. **Exit:** When all players have `wagerLocked: true`, transition to "answering"

## UI Components

### WageringScreen (New Component)

Displays:
- Round number (e.g., "Round 3 of 10")
- Category name prominently
- Player's remaining boxes as clickable tiles
- Other players' wager status (name + selected box or "choosing...")
- "Lock In" button

### Box Display

```
Available boxes shown as tiles:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
└───┘ └───┘ └───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 6 │ │ 7 │ │ 8 │ │ 9 │ │10 │
└───┘ └───┘ └───┘ └───┘ └───┘

Used boxes: grayed out / crossed
Selected box: highlighted
```

## Implementation Notes

### Question Selection
- Build array of 10 random questions at game start (not a board)
- Each question from different category if possible for variety
- Store as `questions` array instead of `board`

### Bot Behavior
- Bots wager based on simple heuristic:
  - High boxes (7-10) for "easy" categories they know
  - Low boxes (1-3) for harder categories
  - Or just random selection for simplicity

### No Picker Role
- Unlike classic mode, no player picks questions
- All questions pre-determined, revealed sequentially
- Host controls "Continue to Next Round" between rounds

## Migration Path

Quick mode is separate from classic mode:
- `game_mode: "quick"` vs `game_mode: "classic"`
- Existing classic mode unchanged
- Quick mode uses different phase flow and player structure
