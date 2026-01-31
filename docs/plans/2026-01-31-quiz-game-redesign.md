# Quiz Game Redesign

## Overview

Complete overhaul of the quiz game with sleek dark mode design, simplified setup, and two game modes (Long and Quick).

## Design System

### Colors

```css
/* Background layers */
--bg-primary: #0f0f14;      /* Deepest background */
--bg-secondary: #16161d;    /* Cards, panels */
--bg-elevated: #1c1c26;     /* Hover states, elevated elements */
--bg-overlay: #22222e;      /* Modals, dropdowns */

/* Purple accent spectrum */
--accent-primary: #8b5cf6;   /* Main purple */
--accent-light: #a78bfa;     /* Hover, highlights */
--accent-dim: #6d4bc4;       /* Pressed states */
--accent-glow: rgba(139, 92, 246, 0.3);  /* Glow effects */

/* Semantic colors */
--correct: #22c55e;          /* Green for correct */
--correct-glow: rgba(34, 197, 94, 0.3);
--incorrect: #ef4444;        /* Red for wrong */
--incorrect-glow: rgba(239, 68, 68, 0.3);

/* Text */
--text-primary: #f4f4f5;     /* Main text */
--text-secondary: #a1a1aa;   /* Subdued text */
--text-muted: #71717a;       /* Hints, labels */

/* Borders */
--border: rgba(255, 255, 255, 0.08);
--border-hover: rgba(255, 255, 255, 0.15);
```

### Typography

```css
--font-display: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 2rem;      /* 32px */
```

### Spacing & Radius

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;

--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;
```

### Effects

```css
/* Subtle shadows for depth */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

/* Accent glow */
--glow-accent: 0 0 20px var(--accent-glow);
--glow-correct: 0 0 20px var(--correct-glow);
--glow-incorrect: 0 0 20px var(--incorrect-glow);

/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 250ms ease;
```

---

## Screens & Components

### 1. Home Screen

Simple entry point with game mode selection.

```
┌─────────────────────────────────┐
│  ← Back                         │
│                                 │
│           QUIZ                  │
│    Test your knowledge          │
│                                 │
│  ┌─────────────────────────┐   │
│  │  ⚡ QUICK GAME           │   │
│  │  5 questions, fast pace  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  📋 CLASSIC GAME         │   │
│  │  Full board, pick your   │   │
│  │  questions               │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  🚪 JOIN ROOM            │   │
│  │  Enter a room code       │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Components:**
- `ModeCard` - Clickable card for each mode
- Subtle hover glow effect

### 2. Setup Screen (Create Room)

Minimal configuration - just name + category theme.

```
┌─────────────────────────────────┐
│  ← Back           Room: ABC12   │
│                                 │
│  Your Name                      │
│  ┌─────────────────────────┐   │
│  │ Player name...          │   │
│  └─────────────────────────┘   │
│                                 │
│  Choose a Theme                 │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🎲   │ │ 🔬   │ │ 🎬   │   │
│  │Mixed │ │Science│ │Movies│   │
│  └──────┘ └──────┘ └──────┘   │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🎵   │ │ 🌍   │ │ 📚   │   │
│  │Music │ │ Geo  │ │History│   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  [ Create Room ]                │
│                                 │
└─────────────────────────────────┘
```

**Theme Options:**
- Mixed (random 6 categories)
- Science & Tech
- Entertainment (Film, Music, TV)
- Geography & History
- Pop Culture
- Sports & Games

### 3. Lobby Screen

Clean waiting room with player list.

```
┌─────────────────────────────────┐
│  CLASSIC MODE        ABC12 📋   │
│  Theme: Mixed                   │
│─────────────────────────────────│
│                                 │
│  Players (3)                    │
│  ┌─────────────────────────┐   │
│  │ 👑 Alex          HOST   │   │
│  │    Sam                   │   │
│  │    Jordan               │   │
│  │  + Add Bot              │   │
│  └─────────────────────────┘   │
│                                 │
│  Share this code to invite:    │
│  ┌─────────────────────────┐   │
│  │    ABC12     [Copy]     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │      START GAME         │   │
│  └─────────────────────────┘   │
│  Need 2+ players               │
│                                 │
│  [Leave Room]                   │
└─────────────────────────────────┘
```

**Components:**
- `PlayerList` - Animated list with join/leave transitions
- `RoomCode` - Copyable code with feedback
- Host crown indicator

### 4. Board Screen (Classic Mode)

Clean Jeopardy-style grid.

```
┌─────────────────────────────────────────┐
│  Sam's turn to pick                     │
│─────────────────────────────────────────│
│  Science │ Film  │ Music │ Geo │History │
│──────────┼───────┼───────┼─────┼────────│
│   100    │  100  │  100  │ 100 │  100   │
│──────────┼───────┼───────┼─────┼────────│
│   200    │  200  │  ---  │ 200 │  200   │
│──────────┼───────┼───────┼─────┼────────│
│   300    │  300  │  300  │ 300 │  ---   │
│──────────┼───────┼───────┼─────┼────────│
│   400    │  ---  │  400  │ 400 │  400   │
│──────────┼───────┼───────┼─────┼────────│
│   500    │  500  │  500  │ 500 │  500   │
│─────────────────────────────────────────│
│  🥇 Alex: 1200  🥈 Sam: 800  🥉 You: 600│
└─────────────────────────────────────────┘
```

**Design notes:**
- Used questions show as muted/crossed out
- Picker's selectable tiles have subtle pulse
- Compact scoreboard at bottom
- Mobile: horizontal scroll or 2-column carousel

### 5. Question Screen

Full-screen focus on the question.

```
┌─────────────────────────────────┐
│  Science                 300pts │
│                    ⏱️ 45s       │
│─────────────────────────────────│
│                                 │
│  What is the chemical symbol    │
│  for gold?                      │
│                                 │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐   │
│  │  A.  Au                  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  B.  Ag                  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  C.  Fe                  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  D.  Go                  │   │
│  └─────────────────────────┘   │
│                                 │
│  3/4 answered ████████░░       │
└─────────────────────────────────┘
```

**Components:**
- `Timer` - Circular or linear progress
- `OptionCard` - Selection with immediate feedback
- `AnswerProgress` - Shows who has answered (no names, just count)

### 6. Reveal Screen (Snappy - 2-3 seconds)

Quick answer reveal with results.

```
┌─────────────────────────────────┐
│                                 │
│         ✓ Au                    │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ✓ Alex       +300  0.8s │   │
│  │ ✓ Sam        +240  1.2s │   │
│  │ ✓ You        +180  2.1s │   │
│  │ ✗ Jordan       0   ---  │   │
│  └─────────────────────────┘   │
│                                 │
│  Auto-continuing...            │
└─────────────────────────────────┘
```

**Design notes:**
- Green check / red X for correct/incorrect
- Points + response time shown
- Auto-continues after 2-3 seconds
- Subtle animation for point awards

### 7. End Screen (Leaderboard with Stats)

Full results with statistics.

```
┌─────────────────────────────────┐
│         GAME OVER               │
│─────────────────────────────────│
│                                 │
│  🥇  Alex         2,400 pts     │
│      87% accuracy · 1.2s avg    │
│                                 │
│  🥈  Sam          1,800 pts     │
│      73% accuracy · 1.8s avg    │
│                                 │
│  🥉  You          1,500 pts     │
│      67% accuracy · 2.1s avg    │
│                                 │
│  4.  Jordan         900 pts     │
│      47% accuracy · 3.2s avg    │
│                                 │
│─────────────────────────────────│
│                                 │
│  [Play Again]    [Leave]        │
│                                 │
└─────────────────────────────────┘
```

**Stats to show:**
- Final score
- Accuracy percentage
- Average response time
- Optional: fastest answer, streak

---

## Data Flow

### Question Loading

1. On app load or theme selection, fetch questions from `quiz_questions` table
2. Filter by category theme → random 6 categories
3. Build board: 5 questions per category (easy→hard mapped to 100→500)
4. Store board in room state

### Database Schema (existing)

```sql
-- quiz_questions table (already exists)
- id, category_id, difficulty, type
- question, correct_answer, incorrect_answers
- likes, dislikes, times_shown

-- quiz_rooms table (already exists)
- code, phase, players[], host_id, picker_id
- question_pack, board[], current_question
```

### Theme → Categories Mapping

```javascript
const THEMES = {
  mixed: null, // Random 6
  science: [17, 18, 19, 30], // Science, Computers, Math, Gadgets
  entertainment: [11, 12, 14, 15, 29, 31], // Film, Music, TV, Games, Comics, Anime
  geography: [22, 23, 27], // Geo, History, Animals
  popculture: [26, 11, 12, 14], // Celebrities, Film, Music, TV
  sports: [21, 28, 16] // Sports, Vehicles, Board Games
}
```

---

## Implementation Plan

### Phase 1: Design System & CSS
1. Create new `quiz.css` with design system variables
2. Remove old game-show styling
3. Set up component base styles

### Phase 2: Simplified Lobby Flow
1. Update Home screen with mode selection
2. Create minimal Setup screen (name + theme picker)
3. Simplify Lobby to just player list + start
4. Remove pack selection complexity

### Phase 3: Question Loading Fix
1. Create question fetch script to populate database
2. Implement theme-based category selection
3. Remove live API code path
4. Test question loading reliability

### Phase 4: Game Screens Redesign
1. Redesign Board screen (cleaner grid)
2. Redesign Question screen (card answers)
3. Implement snappy Reveal (auto-continue)
4. Create stats-focused End screen

### Phase 5: Polish
1. Add transitions/animations
2. Mobile responsive refinements
3. Test multiplayer flows
4. Bug fixes

---

## Files to Modify

**New/Replace:**
- `src/games/quiz/quiz.css` - Complete rewrite
- `src/games/quiz/QuizGame.jsx` - Add mode selection
- `src/games/quiz/components/Setup.jsx` - New minimal setup
- `src/games/quiz/components/Lobby.jsx` - Simplify
- `src/games/quiz/components/Board.jsx` - Redesign
- `src/games/quiz/components/QuestionRound.jsx` - Redesign
- `src/games/quiz/components/RevealScreen.jsx` - Snappy auto-continue
- `src/games/quiz/components/EndScreen.jsx` - Stats leaderboard

**Update:**
- `src/games/quiz/hooks/useQuizRoom.js` - Theme-based loading
- `src/games/quiz/data/questions-db.js` - Theme filtering

**Remove:**
- Pack selection UI from Lobby
- Category filter complexity
- Live API code path (opentdb.js can stay for reference)

---

## Quick Mode (TBD)

Space reserved for Quick Mode design after Classic Mode is complete.
