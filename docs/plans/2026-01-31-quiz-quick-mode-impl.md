# Quiz Quick Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Quick Mode with box wagering mechanic and session token system for robust player reconnection.

**Architecture:** Quick mode adds a "wagering" phase before each question where players allocate numbered boxes (1-10). Session tokens embedded in URLs allow rejoining even from incognito. Both features integrate with existing Supabase realtime infrastructure.

**Tech Stack:** React, Supabase Realtime, JavaScript (matching existing quiz codebase style)

---

## Task 1: Session Token URL Helpers

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js:40-55`

**Step 1: Add session token URL functions**

Add these functions after `updateURLWithRoomCode`:

```javascript
// Generate a short session token
function generateSessionToken() {
  return Math.random().toString(36).substring(2, 8)
}

// Get session token from URL
function getSessionTokenFromURL() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('session') || null
}

// Update URL with session token
function updateURLWithSessionToken(token) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (token) {
    url.searchParams.set('session', token)
  } else {
    url.searchParams.delete('session')
  }
  window.history.replaceState({}, '', url)
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): add session token URL helpers"
```

---

## Task 2: Add Session Token to Player Join Flow

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js` (createRoom and joinRoom functions)

**Step 1: Update createRoom to generate session token**

In the `createRoom` function, update the player object creation (around line 195):

```javascript
const sessionToken = generateSessionToken()
const newRoom = {
  code,
  phase: 'lobby',
  game_mode: gameMode,
  theme: { id: theme?.id || 'mixed', name: theme?.name || 'Mixed' },
  players: [{
    id: playerId,
    name: hostName,
    sessionToken,  // ADD THIS
    score: 0,
    hasAnswered: false,
    correctCount: 0,
    totalTime: 0,
    answerCount: 0
  }],
  host_id: playerId,
  picker_id: playerId,
  board,
  current_question: null
}
```

After `setRoom(data)`, add:

```javascript
updateURLWithSessionToken(sessionToken)
```

**Step 2: Update joinRoom to generate session token**

In the `joinRoom` function, update the new player object (around line 250):

```javascript
const sessionToken = generateSessionToken()
const updatedPlayers = [
  ...existingRoom.players,
  {
    id: playerId,
    name: playerName,
    sessionToken,  // ADD THIS
    score: 0,
    hasAnswered: false,
    correctCount: 0,
    totalTime: 0,
    answerCount: 0
  }
]
```

After `setRoom(data)`, add:

```javascript
const myPlayer = data.players.find(p => p.id === playerId)
if (myPlayer?.sessionToken) {
  updateURLWithSessionToken(myPlayer.sessionToken)
}
```

**Step 3: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): add session token to player join flow"
```

---

## Task 3: Update tryRejoin to Use Session Tokens

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js` (tryRejoin function)

**Step 1: Rewrite tryRejoin with session token support**

Replace the entire `tryRejoin` function:

```javascript
const tryRejoin = useCallback(async () => {
  const urlCode = getRoomCodeFromURL()
  const savedCode = getSavedRoomCode()
  const code = urlCode || savedCode
  const sessionToken = getSessionTokenFromURL()

  if (!code) return null

  setLoading(true)
  try {
    const { data: existingRoom, error: fetchError } = await supabaseGames
      .from('quiz_rooms')
      .select()
      .eq('code', code)
      .single()

    if (fetchError || !existingRoom) {
      saveRoomCode(null)
      updateURLWithRoomCode(null)
      updateURLWithSessionToken(null)
      return null
    }

    // Try session token match first (works even with new playerId)
    let existingPlayer = null
    if (sessionToken) {
      existingPlayer = existingRoom.players.find(p => p.sessionToken === sessionToken)
    }
    
    // Fall back to playerId match
    if (!existingPlayer) {
      existingPlayer = existingRoom.players.find(p => p.id === playerId)
    }

    if (existingPlayer) {
      // Update player's ID if rejoining via session token with different browser
      if (existingPlayer.id !== playerId) {
        const updatedPlayers = existingRoom.players.map(p =>
          p.sessionToken === sessionToken ? { ...p, id: playerId } : p
        )
        
        // Also update host_id and picker_id if needed
        const updates = { players: updatedPlayers }
        if (existingRoom.host_id === existingPlayer.id) {
          updates.host_id = playerId
        }
        if (existingRoom.picker_id === existingPlayer.id) {
          updates.picker_id = playerId
        }

        await supabaseGames
          .from('quiz_rooms')
          .update(updates)
          .eq('code', code)
      }

      saveRoomCode(existingRoom.code)
      updateURLWithRoomCode(existingRoom.code)
      updateURLWithSessionToken(existingPlayer.sessionToken)
      setRoom(existingRoom)
      return existingRoom
    }

    // URL has room code but player not in room - prompt to join
    if (urlCode) {
      return { code: urlCode, needsJoin: true }
    }

    saveRoomCode(null)
    return null
  } catch (err) {
    saveRoomCode(null)
    updateURLWithRoomCode(null)
    updateURLWithSessionToken(null)
    return null
  } finally {
    setLoading(false)
  }
}, [playerId])
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): session token rejoin support"
```

---

## Task 4: Build Quick Mode Questions Function

**Files:**
- Modify: `src/games/quiz/data/questions-db.js`

**Step 1: Add buildQuickModeQuestions function**

Add this function after `buildBoardFromCache`:

```javascript
/**
 * Build 10 questions for Quick Mode
 * Each from a different category if possible
 */
export function buildQuickModeQuestions(options = {}) {
  if (!questionsCache || questionsCache.length === 0) {
    console.error('Questions cache not loaded!')
    return { questions: [] }
  }

  const {
    categoryIds = null,
    types = ['multiple', 'boolean'],
    minQuality = -5
  } = options

  // Filter questions by type and quality
  let filtered = questionsCache.filter(q =>
    types.includes(q.type) &&
    (q.likes - q.dislikes) >= minQuality
  )

  // Get available category IDs
  const availableCategoryIds = [...new Set(filtered.map(q => q.category_id))]

  // Select up to 10 different categories
  let selectedCategories
  if (categoryIds && categoryIds.length > 0) {
    const validCategories = categoryIds.filter(id => availableCategoryIds.includes(id))
    selectedCategories = shuffleArray(validCategories).slice(0, 10)
  } else {
    selectedCategories = shuffleArray(availableCategoryIds).slice(0, 10)
  }

  // If fewer than 10 categories, allow repeats
  while (selectedCategories.length < 10) {
    const randomCat = availableCategoryIds[Math.floor(Math.random() * availableCategoryIds.length)]
    selectedCategories.push(randomCat)
  }

  const questions = []

  for (let i = 0; i < 10; i++) {
    const categoryId = selectedCategories[i]
    const catInfo = ALL_CATEGORIES.find(c => c.id === categoryId)

    // Get questions for this category not already used
    const usedIds = questions.map(q => q.id)
    const available = shuffleArray(
      filtered.filter(q => q.category_id === categoryId && !usedIds.includes(q.id))
    )

    const q = available[0]
    if (q) {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : []
      questions.push({
        index: i,
        id: q.id,
        category: catInfo?.short || q.category,
        category_id: categoryId,
        question: q.question,
        answer: q.correct_answer,
        type: q.type,
        options: q.type === 'boolean'
          ? ['True', 'False']
          : shuffleArray([q.correct_answer, ...incorrectAnswers]),
        difficulty: q.difficulty
      })
    }
  }

  return { questions }
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/data/questions-db.js
git commit -m "feat(quiz): add buildQuickModeQuestions function"
```

---

## Task 5: Create Quick Mode Room in useQuizRoom

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Import buildQuickModeQuestions**

Update the import at the top:

```javascript
import { buildBoardFromCache, buildQuickModeQuestions } from '../data/questions-db'
```

**Step 2: Update createRoom to handle quick mode**

In the `createRoom` function, replace the board building section:

```javascript
const createRoom = useCallback(async (hostName, gameMode, theme) => {
  setLoading(true)
  setError(null)

  try {
    const categoryIds = theme?.categories || null
    let board = []
    let questions = []

    if (gameMode === 'quick') {
      // Quick mode: 10 questions
      const result = buildQuickModeQuestions({ categoryIds })
      questions = result.questions
      if (!questions || questions.length === 0) {
        throw new Error('Failed to load questions. Please try again.')
      }
    } else {
      // Classic mode: 30-question board
      const result = buildBoardFromCache({ categoryIds })
      board = result.board
      if (!board || board.length === 0) {
        throw new Error('Failed to load questions. Please try again.')
      }
    }

    const code = generateRoomCode()
    const sessionToken = generateSessionToken()
    
    const newRoom = {
      code,
      phase: 'lobby',
      game_mode: gameMode,
      theme: { id: theme?.id || 'mixed', name: theme?.name || 'Mixed' },
      players: [{
        id: playerId,
        name: hostName,
        sessionToken,
        score: 0,
        hasAnswered: false,
        correctCount: 0,
        totalTime: 0,
        answerCount: 0,
        // Quick mode specific
        ...(gameMode === 'quick' && {
          availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          currentWager: null,
          wagerLocked: false
        })
      }],
      host_id: playerId,
      picker_id: playerId,
      // Classic uses board, Quick uses questions
      board: gameMode === 'classic' ? board : [],
      questions: gameMode === 'quick' ? questions : [],
      round_number: gameMode === 'quick' ? 0 : null,
      current_question: null
    }

    const { data, error: supabaseError } = await supabaseGames
      .from('quiz_rooms')
      .insert(newRoom)
      .select()
      .single()

    if (supabaseError) throw supabaseError

    updateName(hostName)
    saveRoomCode(data.code)
    updateURLWithRoomCode(data.code)
    updateURLWithSessionToken(sessionToken)

    setRoom(data)
    return data
  } catch (err) {
    setError(err.message)
    return null
  } finally {
    setLoading(false)
  }
}, [playerId, updateName])
```

**Step 3: Update joinRoom to handle quick mode player structure**

In `joinRoom`, update the new player object:

```javascript
const sessionToken = generateSessionToken()
const isQuickMode = existingRoom.game_mode === 'quick'
const updatedPlayers = [
  ...existingRoom.players,
  {
    id: playerId,
    name: playerName,
    sessionToken,
    score: 0,
    hasAnswered: false,
    correctCount: 0,
    totalTime: 0,
    answerCount: 0,
    // Quick mode specific
    ...(isQuickMode && {
      availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      currentWager: null,
      wagerLocked: false
    })
  }
]
```

**Step 4: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): quick mode room creation with player boxes"
```

---

## Task 6: Add Quick Mode Game Actions

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Add startQuickRound function**

Add after `startGame`:

```javascript
// Start a quick mode round (wagering phase)
const startQuickRound = useCallback(async () => {
  if (!room || !isHost || room.game_mode !== 'quick') return
  
  const nextRound = (room.round_number || 0) + 1
  if (nextRound > 10) {
    // Game over
    await supabaseGames
      .from('quiz_rooms')
      .update({ phase: 'ended', current_question: null })
      .eq('code', room.code)
    return
  }

  // Reset wagers for all players
  const updatedPlayers = room.players.map(p => ({
    ...p,
    currentWager: null,
    wagerLocked: false,
    hasAnswered: false
  }))

  const question = room.questions[nextRound - 1]

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({
      phase: 'wagering',
      round_number: nextRound,
      players: updatedPlayers,
      current_question: {
        index: nextRound - 1,
        category: question.category,
        started_at: null,  // Set when wagering ends
        submissions: []
      }
    })
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room, isHost])
```

**Step 2: Add selectWager function**

```javascript
// Select a wager box (quick mode)
const selectWager = useCallback(async (boxNumber) => {
  if (!room || room.phase !== 'wagering' || room.game_mode !== 'quick') return

  const player = room.players.find(p => p.id === playerId)
  if (!player || !player.availableBoxes?.includes(boxNumber)) return
  if (player.wagerLocked) return

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, currentWager: boxNumber } : p
  )

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({ players: updatedPlayers })
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room, playerId])
```

**Step 3: Add lockWager function**

```javascript
// Lock in wager (quick mode)
const lockWager = useCallback(async () => {
  if (!room || room.phase !== 'wagering' || room.game_mode !== 'quick') return

  const player = room.players.find(p => p.id === playerId)
  if (!player || player.currentWager === null || player.wagerLocked) return

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, wagerLocked: true } : p
  )

  // Check if all players have locked in
  const allLocked = updatedPlayers.every(p => p.wagerLocked)

  const updates = { players: updatedPlayers }
  
  if (allLocked) {
    // Transition to answering phase
    updates.phase = 'answering'
    updates.current_question = {
      ...room.current_question,
      started_at: new Date().toISOString()
    }
  }

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update(updates)
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room, playerId])
```

**Step 4: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): add wagering actions for quick mode"
```

---

## Task 7: Update revealAnswers for Quick Mode

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Update revealAnswers to handle quick mode scoring**

Replace the `revealAnswers` function:

```javascript
const revealAnswers = useCallback(async () => {
  if (!room || room.phase !== 'answering') return

  const isQuickMode = room.game_mode === 'quick'
  const question = isQuickMode
    ? room.questions[room.current_question.index]
    : room.board[room.current_question.index]
  
  const submissions = room.current_question.submissions || []

  const evaluatedSubmissions = submissions.map(s => {
    let isCorrect
    if (question.type === 'multiple' || question.type === 'boolean') {
      isCorrect = s.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
    } else {
      isCorrect = isAnswerCorrect(s.answer, question.answer, question.alternates)
    }

    const startTime = new Date(room.current_question.started_at).getTime()
    const submitTime = new Date(s.submitted_at).getTime()
    const responseTime = (submitTime - startTime) / 1000

    return { ...s, correct: isCorrect, responseTime }
  })

  let updatedPlayers
  let updatedBoard = room.board
  let nextPickerId = room.picker_id

  if (isQuickMode) {
    // Quick mode: score based on wager, remove used box
    updatedPlayers = room.players.map(p => {
      const submission = evaluatedSubmissions.find(s => s.player_id === p.id)
      const wager = p.currentWager || 0
      const pointsEarned = submission?.correct ? wager : 0
      
      return {
        ...p,
        score: p.score + pointsEarned,
        correctCount: submission?.correct ? (p.correctCount || 0) + 1 : (p.correctCount || 0),
        totalTime: (p.totalTime || 0) + (submission?.responseTime || 0),
        answerCount: (p.answerCount || 0) + 1,
        // Remove used box
        availableBoxes: p.availableBoxes.filter(b => b !== p.currentWager)
      }
    })
  } else {
    // Classic mode: existing point calculation
    const pointsAwarded = calculatePoints(evaluatedSubmissions, question.value)

    updatedPlayers = room.players.map(p => {
      const awarded = pointsAwarded.find(pa => pa.player_id === p.id)
      const submission = evaluatedSubmissions.find(s => s.player_id === p.id)

      if (awarded && submission) {
        return {
          ...p,
          score: p.score + awarded.points,
          correctCount: submission.correct ? (p.correctCount || 0) + 1 : (p.correctCount || 0),
          totalTime: (p.totalTime || 0) + (submission.responseTime || 0),
          answerCount: (p.answerCount || 0) + 1
        }
      }
      return p
    })

    updatedBoard = room.board.map((q, i) =>
      i === room.current_question.index ? { ...q, used: true } : q
    )

    if (pointsAwarded.length > 0) {
      nextPickerId = pointsAwarded[0].player_id
    }
  }

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({
      phase: 'reveal',
      players: updatedPlayers,
      board: updatedBoard,
      picker_id: nextPickerId,
      current_question: {
        ...room.current_question,
        submissions: evaluatedSubmissions,
        points_awarded: isQuickMode ? null : calculatePoints(evaluatedSubmissions, question.value)
      }
    })
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room])
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): quick mode scoring in revealAnswers"
```

---

## Task 8: Update continueGame for Quick Mode

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Update continueGame**

Replace the `continueGame` function:

```javascript
const continueGame = useCallback(async () => {
  if (!room || room.phase !== 'reveal') return

  const isQuickMode = room.game_mode === 'quick'

  if (isQuickMode) {
    // Quick mode: check if more rounds
    if (room.round_number >= 10) {
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({ phase: 'ended', current_question: null })
        .eq('code', room.code)
      if (updateError) setError(updateError.message)
    } else {
      // Start next round (wagering phase)
      const nextRound = room.round_number + 1
      const question = room.questions[nextRound - 1]

      const updatedPlayers = room.players.map(p => ({
        ...p,
        currentWager: null,
        wagerLocked: false,
        hasAnswered: false
      }))

      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'wagering',
          round_number: nextRound,
          players: updatedPlayers,
          current_question: {
            index: nextRound - 1,
            category: question.category,
            started_at: null,
            submissions: []
          }
        })
        .eq('code', room.code)
      if (updateError) setError(updateError.message)
    }
  } else {
    // Classic mode: check remaining questions
    const remainingQ = room.board.filter(q => !q.used).length

    if (remainingQ === 0) {
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({ phase: 'ended', current_question: null })
        .eq('code', room.code)
      if (updateError) setError(updateError.message)
    } else {
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({ phase: 'picking', current_question: null })
        .eq('code', room.code)
      if (updateError) setError(updateError.message)
    }
  }
}, [room])
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): quick mode round progression"
```

---

## Task 9: Update startGame for Quick Mode

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Update startGame to handle quick mode**

Replace the `startGame` function:

```javascript
const startGame = useCallback(async () => {
  if (!room || !isHost || room.phase !== 'lobby') return

  if (room.players.length < 2) {
    setError('Need at least 2 players to start')
    return
  }

  const isQuickMode = room.game_mode === 'quick'
  
  if (isQuickMode) {
    // Quick mode: start round 1 wagering
    const question = room.questions[0]
    
    const updatedPlayers = room.players.map(p => ({
      ...p,
      currentWager: null,
      wagerLocked: false,
      hasAnswered: false
    }))

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'wagering',
        round_number: 1,
        players: updatedPlayers,
        current_question: {
          index: 0,
          category: question.category,
          started_at: null,
          submissions: []
        }
      })
      .eq('code', room.code)

    if (!updateError) {
      incrementGamesHosted()
    } else {
      setError(updateError.message)
    }
  } else {
    // Classic mode: go to picking phase
    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ phase: 'picking' })
      .eq('code', room.code)

    if (!updateError) {
      incrementGamesHosted()
    } else {
      setError(updateError.message)
    }
  }
}, [room, isHost, incrementGamesHosted])
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): quick mode game start"
```

---

## Task 10: Export New Functions from useQuizRoom

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Add derived state for quick mode**

Add after the `currentQuestion` derived state:

```javascript
// Quick mode current question (from questions array)
const quickCurrentQuestion = room?.game_mode === 'quick' && room?.current_question
  ? room.questions?.[room.current_question.index]
  : null

// Effective current question (works for both modes)
const effectiveCurrentQuestion = room?.game_mode === 'quick'
  ? quickCurrentQuestion
  : currentQuestion

// Current player's wager info
const currentWager = currentPlayer?.currentWager ?? null
const wagerLocked = currentPlayer?.wagerLocked ?? false
const availableBoxes = currentPlayer?.availableBoxes ?? []

// All wagers (for display)
const playerWagers = room?.players?.map(p => ({
  id: p.id,
  name: p.name,
  wager: p.currentWager,
  locked: p.wagerLocked
})) ?? []
```

**Step 2: Update the return statement**

Add the new values and functions to the return:

```javascript
return {
  room,
  loading,
  error,
  playerId,
  currentPlayer,
  isHost,
  isPicker,
  hasAnswered,
  categories,
  currentQuestion: effectiveCurrentQuestion,  // UPDATED
  timeRemaining,
  sortedPlayers,
  remainingQuestions,
  savedName: profile.name,
  // Quick mode specific
  currentWager,
  wagerLocked,
  availableBoxes,
  playerWagers,
  roundNumber: room?.round_number ?? 0,
  // Actions
  createRoom,
  joinRoom,
  tryRejoin,
  leaveRoom,
  startGame,
  addBot,
  removeBot,
  selectQuestion,
  submitAnswer,
  revealAnswers,
  continueGame,
  endGameEarly,
  playAgain,
  // Quick mode actions
  selectWager,
  lockWager
}
```

**Step 3: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): export quick mode state and actions"
```

---

## Task 11: Create WageringScreen Component

**Files:**
- Create: `src/games/quiz/components/WageringScreen.jsx`

**Step 1: Create the component**

```javascript
import { useState } from 'react'

export function WageringScreen({
  room,
  roundNumber,
  currentQuestion,
  availableBoxes,
  currentWager,
  wagerLocked,
  playerWagers,
  onSelectWager,
  onLockWager
}) {
  const category = currentQuestion?.category || room.current_question?.category

  return (
    <div className="quiz-game quiz-wagering">
      {/* Header */}
      <div className="quiz-wagering__header">
        <span className="quiz-wagering__round">Round {roundNumber} of 10</span>
        <h2 className="quiz-wagering__category">{category}</h2>
        <p className="quiz-wagering__hint">How confident are you in this category?</p>
      </div>

      {/* Box Selection */}
      <div className="quiz-wagering__boxes">
        <p className="quiz-wagering__label">Select your wager:</p>
        <div className="quiz-wagering__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
            const isAvailable = availableBoxes.includes(num)
            const isSelected = currentWager === num
            
            return (
              <button
                key={num}
                className={`quiz-box ${isSelected ? 'quiz-box--selected' : ''} ${!isAvailable ? 'quiz-box--used' : ''}`}
                onClick={() => isAvailable && !wagerLocked && onSelectWager(num)}
                disabled={!isAvailable || wagerLocked}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lock Button */}
      <div className="quiz-wagering__actions">
        <button
          className="quiz-btn quiz-btn--primary quiz-btn--large"
          onClick={onLockWager}
          disabled={currentWager === null || wagerLocked}
        >
          {wagerLocked ? 'Locked In!' : 'Lock In Wager'}
        </button>
      </div>

      {/* Other Players' Wagers */}
      <div className="quiz-wagering__players">
        <p className="quiz-wagering__label">Other players:</p>
        <div className="quiz-wagering__player-list">
          {playerWagers.map(p => (
            <div key={p.id} className="quiz-wagering__player">
              <span className="quiz-wagering__player-name">{p.name}</span>
              <span className={`quiz-wagering__player-wager ${p.locked ? 'quiz-wagering__player-wager--locked' : ''}`}>
                {p.locked ? `${p.wager} pts` : p.wager ? 'Choosing...' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/components/WageringScreen.jsx
git commit -m "feat(quiz): add WageringScreen component"
```

---

## Task 12: Add WageringScreen Styles

**Files:**
- Modify: `src/games/quiz/quiz.css`

**Step 1: Add wagering styles**

Add at the end of the file:

```css
/* ==================== WAGERING SCREEN ==================== */

.quiz-wagering {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  min-height: 100vh;
}

.quiz-wagering__header {
  text-align: center;
}

.quiz-wagering__round {
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.quiz-wagering__category {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--accent-primary);
  margin: 0.5rem 0;
}

.quiz-wagering__hint {
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.quiz-wagering__boxes {
  width: 100%;
  max-width: 400px;
}

.quiz-wagering__label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: 1rem;
  text-align: center;
}

.quiz-wagering__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.quiz-box {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-box:hover:not(:disabled) {
  border-color: var(--accent-primary);
  background: var(--bg-elevated);
}

.quiz-box--selected {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
  transform: scale(1.05);
}

.quiz-box--used {
  opacity: 0.3;
  cursor: not-allowed;
  text-decoration: line-through;
}

.quiz-wagering__actions {
  margin-top: 1rem;
}

.quiz-wagering__players {
  width: 100%;
  max-width: 400px;
  margin-top: 1rem;
}

.quiz-wagering__player-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-wagering__player {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.quiz-wagering__player-name {
  font-weight: 500;
}

.quiz-wagering__player-wager {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.quiz-wagering__player-wager--locked {
  color: var(--accent-primary);
  font-weight: 600;
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/quiz.css
git commit -m "style(quiz): add wagering screen styles"
```

---

## Task 13: Integrate WageringScreen into QuizGame

**Files:**
- Modify: `src/games/quiz/QuizGame.jsx`

**Step 1: Import WageringScreen**

Add to imports:

```javascript
import { WageringScreen } from './components/WageringScreen'
```

**Step 2: Destructure new values from useQuizRoom**

Update the destructuring:

```javascript
const {
  room,
  loading,
  error,
  playerId,
  currentPlayer,
  isHost,
  isPicker,
  hasAnswered,
  categories,
  currentQuestion,
  timeRemaining,
  sortedPlayers,
  remainingQuestions,
  savedName,
  // Quick mode
  currentWager,
  wagerLocked,
  availableBoxes,
  playerWagers,
  roundNumber,
  // Actions
  createRoom,
  joinRoom,
  tryRejoin,
  leaveRoom,
  startGame,
  addBot,
  removeBot,
  selectQuestion,
  submitAnswer,
  revealAnswers,
  continueGame,
  endGameEarly,
  playAgain,
  selectWager,
  lockWager
} = useQuizRoom()
```

**Step 3: Add wagering phase rendering**

In the render section where phases are handled, add the wagering case. Find where `room.phase` is checked and add:

```javascript
{room.phase === 'wagering' && (
  <WageringScreen
    room={room}
    roundNumber={roundNumber}
    currentQuestion={currentQuestion}
    availableBoxes={availableBoxes}
    currentWager={currentWager}
    wagerLocked={wagerLocked}
    playerWagers={playerWagers}
    onSelectWager={selectWager}
    onLockWager={lockWager}
  />
)}
```

**Step 4: Commit**

```bash
git add src/games/quiz/QuizGame.jsx
git commit -m "feat(quiz): integrate WageringScreen into game flow"
```

---

## Task 14: Update QuestionRound for Quick Mode

**Files:**
- Modify: `src/games/quiz/components/QuestionRound.jsx`

**Step 1: Update to show wager instead of value**

Update the component to accept and display wager:

```javascript
import { useState, useEffect } from 'react'

export function QuestionRound({
  room,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  onSubmitAnswer,
  currentWager  // NEW PROP
}) {
  const [selectedOption, setSelectedOption] = useState(null)

  useEffect(() => {
    console.log('Current question:', currentQuestion)
  }, [currentQuestion])

  const handleOptionSelect = (option) => {
    if (hasAnswered) return
    setSelectedOption(option)
    onSubmitAnswer(option)
  }

  const answeredCount = room.players.filter(p => p.hasAnswered).length
  const totalPlayers = room.players.length

  const timerClass = timeRemaining <= 10
    ? 'quiz-timer--critical'
    : timeRemaining <= 30
      ? 'quiz-timer--warning'
      : ''

  const letters = ['A', 'B', 'C', 'D']
  const isBoolean = currentQuestion.type === 'boolean'
  const isQuickMode = room.game_mode === 'quick'

  const options = currentQuestion.options && currentQuestion.options.length > 0
    ? currentQuestion.options
    : isBoolean
      ? ['True', 'False']
      : [currentQuestion.answer, 'Option B', 'Option C', 'Option D']

  // Display value: wager for quick mode, point value for classic
  const displayValue = isQuickMode ? currentWager : currentQuestion.value

  return (
    <div className="quiz-game quiz-question">
      <div className="quiz-question__header">
        <div className="quiz-question__meta">
          <span className="quiz-question__category">{currentQuestion.category}</span>
          <span className="quiz-question__value">
            {isQuickMode ? `Wager: ${displayValue}` : `${displayValue} pts`}
          </span>
        </div>
        {/* ... rest of component unchanged ... */}
```

**Step 2: Commit**

```bash
git add src/games/quiz/components/QuestionRound.jsx
git commit -m "feat(quiz): show wager in QuestionRound for quick mode"
```

---

## Task 15: Update RevealScreen for Quick Mode

**Files:**
- Modify: `src/games/quiz/components/RevealScreen.jsx`

**Step 1: Read the current component**

First read the file to understand its structure, then update to show wager-based results.

**Step 2: Update to show wager results**

Add wager display and update scoring display for quick mode:

```javascript
// In the component props, add:
currentWager,
playerWagers

// In the render, show wagered amounts:
{room.game_mode === 'quick' && (
  <div className="quiz-reveal__wagers">
    <p className="quiz-reveal__wagers-title">Wagers this round:</p>
    {playerWagers.map(p => {
      const submission = submissions.find(s => s.player_id === p.id)
      const wasCorrect = submission?.correct
      return (
        <div key={p.id} className={`quiz-reveal__wager-row ${wasCorrect ? 'quiz-reveal__wager-row--correct' : ''}`}>
          <span>{p.name}</span>
          <span>{p.wager} pts {wasCorrect ? '✓' : '✗'}</span>
        </div>
      )
    })}
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/games/quiz/components/RevealScreen.jsx
git commit -m "feat(quiz): show wager results in RevealScreen"
```

---

## Task 16: Update Bot Behavior for Quick Mode

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Add bot wagering logic**

In the bot behavior `useEffect`, add wagering logic:

```javascript
// Bot wagering (quick mode)
if (room.phase === 'wagering' && room.game_mode === 'quick') {
  const botsToWager = bots.filter(b => !b.wagerLocked && b.availableBoxes?.length > 0)
  
  if (botsToWager.length > 0) {
    const timeouts = botsToWager.map(bot => {
      const delay = 1500 + Math.random() * 3000
      return setTimeout(async () => {
        const { data: fresh } = await supabaseGames
          .from('quiz_rooms')
          .select()
          .eq('code', room.code)
          .single()

        if (fresh?.phase !== 'wagering') return

        const freshBot = fresh.players.find(p => p.id === bot.id)
        if (!freshBot || freshBot.wagerLocked) return

        // Bot picks a random available box
        const available = freshBot.availableBoxes || []
        if (available.length === 0) return
        
        const wager = available[Math.floor(Math.random() * available.length)]

        const updatedPlayers = fresh.players.map(p =>
          p.id === bot.id ? { ...p, currentWager: wager, wagerLocked: true } : p
        )

        // Check if all players have locked in
        const allLocked = updatedPlayers.every(p => p.wagerLocked)

        const updates = { players: updatedPlayers }
        if (allLocked) {
          updates.phase = 'answering'
          updates.current_question = {
            ...fresh.current_question,
            started_at: new Date().toISOString()
          }
        }

        await supabaseGames
          .from('quiz_rooms')
          .update(updates)
          .eq('code', room.code)
      }, delay)
    })
    return () => timeouts.forEach(t => clearTimeout(t))
  }
}
```

**Step 2: Update bot continuing logic for quick mode**

Update the reveal phase bot logic:

```javascript
// Bot continues (both modes)
if (room.phase === 'reveal') {
  const isQuickMode = room.game_mode === 'quick'
  
  // In quick mode, any bot that's present can trigger continue
  // In classic mode, only the picker bot
  const shouldBotContinue = isQuickMode
    ? bots.length > 0
    : bots.find(b => b.id === room.picker_id)

  if (shouldBotContinue) {
    const delay = 3000 + Math.random() * 2000
    const timeout = setTimeout(async () => {
      if (isQuickMode) {
        if (room.round_number >= 10) {
          await supabaseGames
            .from('quiz_rooms')
            .update({ phase: 'ended', current_question: null })
            .eq('code', room.code)
        } else {
          // Trigger next round
          const nextRound = room.round_number + 1
          const question = room.questions[nextRound - 1]

          const updatedPlayers = room.players.map(p => ({
            ...p,
            currentWager: null,
            wagerLocked: false,
            hasAnswered: false
          }))

          await supabaseGames
            .from('quiz_rooms')
            .update({
              phase: 'wagering',
              round_number: nextRound,
              players: updatedPlayers,
              current_question: {
                index: nextRound - 1,
                category: question.category,
                started_at: null,
                submissions: []
              }
            })
            .eq('code', room.code)
        }
      } else {
        // Classic mode logic (unchanged)
        const remaining = room.board.filter(q => !q.used).length
        await supabaseGames
          .from('quiz_rooms')
          .update({
            phase: remaining === 0 ? 'ended' : 'picking',
            current_question: null
          })
          .eq('code', room.code)
      }
    }, delay)
    return () => clearTimeout(timeout)
  }
}
```

**Step 3: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): bot wagering and round progression for quick mode"
```

---

## Task 17: Update playAgain for Quick Mode

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Update playAgain**

Replace the `playAgain` function:

```javascript
const playAgain = useCallback(async () => {
  if (!room || !isHost) return

  setLoading(true)
  try {
    const isQuickMode = room.game_mode === 'quick'
    let board = []
    let questions = []

    if (isQuickMode) {
      const categoryIds = room.theme?.id !== 'mixed'
        ? room.questions?.slice(0, 3).map(q => q.category_id).filter(Boolean)
        : null
      const result = buildQuickModeQuestions({ categoryIds })
      questions = result.questions
    } else {
      const categoryIds = room.theme?.id !== 'mixed'
        ? room.board.slice(0, 6).map(q => q.category_id).filter(Boolean)
        : null
      const result = buildBoardFromCache({ categoryIds })
      board = result.board
    }

    const resetPlayers = room.players.map(p => ({
      ...p,
      score: 0,
      hasAnswered: false,
      correctCount: 0,
      totalTime: 0,
      answerCount: 0,
      // Reset quick mode fields
      ...(isQuickMode && {
        availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currentWager: null,
        wagerLocked: false
      })
    }))

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'lobby',
        players: resetPlayers,
        board: isQuickMode ? [] : board,
        questions: isQuickMode ? questions : [],
        round_number: isQuickMode ? 0 : null,
        picker_id: room.host_id,
        current_question: null
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [room, isHost])
```

**Step 2: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): playAgain reset for quick mode"
```

---

## Task 18: Update Setup Component Description

**Files:**
- Modify: `src/games/quiz/components/Setup.jsx`

**Step 1: Update the quick mode description**

Change the subtitle text:

```javascript
<p className="quiz-subtitle">
  {gameMode === 'quick'
    ? '10 rounds with strategic wagering'
    : 'Full board with 30 questions'}
</p>
```

**Step 2: Commit**

```bash
git add src/games/quiz/components/Setup.jsx
git commit -m "docs(quiz): update quick mode description in Setup"
```

---

## Task 19: Final Integration Test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Manual test checklist**

- [ ] Create quick mode room
- [ ] Join with second browser/incognito
- [ ] Start game → wagering phase appears
- [ ] Select wager boxes, see others' selections
- [ ] Lock in, all locked → question appears
- [ ] Answer question, reveal shows wagers
- [ ] Continue → next round wagering
- [ ] After 10 rounds → end screen
- [ ] Play again resets boxes
- [ ] Close tab, reopen with URL → rejoins via session token

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(quiz): complete quick mode implementation

- Box wagering mechanic (1-10, each used once)
- Visible wagers between players
- Session token URLs for robust rejoin
- Bot support for quick mode
- 10-round progression"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1-3 | Session token system |
| 4-5 | Quick mode data & room creation |
| 6-10 | Quick mode game actions |
| 11-13 | WageringScreen UI |
| 14-15 | Update existing components |
| 16-17 | Bot behavior & playAgain |
| 18-19 | Polish & testing |

**Estimated tasks:** 19
**Architecture:** Additive changes, classic mode unchanged
