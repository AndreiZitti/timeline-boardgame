# Quiz Game Design

## Overview

A Jeopardy-style multiplayer trivia game where everyone answers each question and points are awarded based on correctness and speed.

## Core Mechanics

- **Board**: 6 categories × 5 values (100-500 points)
- **Answering**: All players answer simultaneously within 60-second timer
- **Validation**: Fuzzy text matching with ~20% typo tolerance
- **Scoring**: 1st correct: 100%, 2nd: 75%, 3rd: 50%, 4th+: 25%
- **Picker**: Last round's winner selects next question
- **End Condition**: Board cleared OR host ends early

## Game Flow

```
LOBBY → PICKING → ANSWERING (60s) → REVEAL → (repeat) → END
```

1. **Lobby**: Host creates room, players join, host selects pack & starts
2. **Picking**: Winner of last round (or host for first) picks a tile
3. **Answering**: Question shown, everyone types answer, 60s timer
4. **Reveal**: Show correct answer, all submissions, points awarded
5. **End**: Final podium when board cleared or host ends early

## Data Model

**Table: `games.quiz_rooms`**

```typescript
{
  id: uuid,
  code: string,              // 5-char room code
  phase: 'lobby' | 'picking' | 'answering' | 'reveal' | 'ended',
  
  players: [{
    id: string,
    name: string,
    score: number,
    hasAnswered: boolean
  }],
  
  host_id: string,
  picker_id: string,
  
  question_pack: string,
  board: [{
    category: string,
    value: number,
    question: string,
    answer: string,
    alternates: string[],
    used: boolean
  }],
  
  current_question: {
    index: number,
    started_at: timestamp,
    submissions: [{
      player_id: string,
      answer: string,
      submitted_at: timestamp,
      correct: boolean | null
    }]
  } | null,
  
  created_at: timestamp
}
```

## Scoring System

```javascript
const multipliers = [1.0, 0.75, 0.5, 0.25]; // 1st, 2nd, 3rd, 4th+

// Sort correct answers by submission time
// Award points: baseValue × multiplier
```

## Fuzzy Matching

- Normalize: lowercase, trim, remove articles (the/a/an), remove punctuation
- Match exact OR Levenshtein distance ≤ 20% of answer length
- Support alternate accepted answers per question

## File Structure

```
src/games/quiz/
├── QuizGame.jsx
├── quiz.css
├── index.js
├── components/
│   ├── CreateRoom.jsx
│   ├── JoinRoom.jsx
│   ├── Lobby.jsx
│   ├── Board.jsx
│   ├── QuestionRound.jsx
│   ├── RevealScreen.jsx
│   ├── Scoreboard.jsx
│   └── EndScreen.jsx
├── hooks/
│   └── useQuizRoom.js
├── utils/
│   └── matching.js
└── data/
    └── packs/
```

## Question Pack Format

```javascript
{
  id: 'pack-id',
  name: 'Pack Name',
  categories: [
    {
      name: 'Category Name',
      questions: [
        { value: 100, q: "Question text", a: "Answer", alt: ["alternates"] },
        // ... 5 questions per category
      ]
    },
    // ... 6 categories
  ]
}
```
