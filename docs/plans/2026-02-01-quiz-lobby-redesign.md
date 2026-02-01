# Quiz Lobby Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify quiz game flow by removing intermediate screens and consolidating all configuration into the Lobby.

**Architecture:** Remove Setup screen, move name entry + game type + category selection into the Lobby. Players join with no name initially, enter it in-lobby. Start button disabled until all players have names.

**Tech Stack:** React, Supabase Realtime, CSS

---

## Task 1: Update useQuizRoom Hook

**Files:**
- Modify: `src/games/quiz/hooks/useQuizRoom.js`

**Step 1: Add new state and actions for lobby configuration**

Add these new actions to the hook:
- `setPlayerName(name)` - Updates current player's name
- `setGameMode(mode)` - Updates game mode (host only)
- `setCategory(categoryId)` - Updates category (host only)

Modify existing:
- `createRoom()` - No longer takes name, creates room with unnamed host
- `joinRoom(code)` - No longer takes name, joins with unnamed player

**Step 2: Implement the changes**

In `useQuizRoom.js`, modify `createRoom`:

```javascript
// Change from: createRoom(hostName, gameMode, theme)
// To: createRoom()
const createRoom = useCallback(async () => {
  setLoading(true)
  setError(null)

  try {
    const code = generateRoomCode()
    const sessionToken = generateSessionToken()

    const newRoom = {
      code,
      phase: 'lobby',
      game_mode: 'quick', // Default mode, can be changed in lobby
      theme: { id: 'mixed', name: 'Mixed' },
      players: [{
        id: playerId,
        name: '', // Empty initially
        sessionToken,
        score: 0,
        hasAnswered: false,
        correctCount: 0,
        totalTime: 0,
        answerCount: 0,
        availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currentWager: null,
        wagerLocked: false
      }],
      host_id: playerId,
      picker_id: playerId,
      board: [],
      questions: [],
      round_number: 0,
      current_question: null
    }

    const { data, error: supabaseError } = await supabaseGames
      .from('quiz_rooms')
      .insert(newRoom)
      .select()
      .single()

    if (supabaseError) throw supabaseError

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
}, [playerId])
```

**Step 3: Add setPlayerName action**

```javascript
const setPlayerName = useCallback(async (name) => {
  if (!room) return

  const trimmedName = name.trim()
  if (!trimmedName) return

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, name: trimmedName } : p
  )

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({ players: updatedPlayers })
    .eq('code', room.code)

  if (updateError) {
    setError(updateError.message)
  } else {
    // Save to localStorage for future sessions
    updateName(trimmedName)
  }
}, [room, playerId, updateName])
```

**Step 4: Add setGameMode action**

```javascript
const setGameMode = useCallback(async (mode) => {
  if (!room || !isHost || room.phase !== 'lobby') return
  if (mode !== 'quick' && mode !== 'classic') return

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({ game_mode: mode })
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room, isHost])
```

**Step 5: Add setCategory action**

```javascript
const setCategory = useCallback(async (category) => {
  if (!room || !isHost || room.phase !== 'lobby') return

  const { error: updateError } = await supabaseGames
    .from('quiz_rooms')
    .update({ theme: category })
    .eq('code', room.code)

  if (updateError) setError(updateError.message)
}, [room, isHost])
```

**Step 6: Update joinRoom to not require name**

```javascript
const joinRoom = useCallback(async (code) => {
  setLoading(true)
  setError(null)

  try {
    const { data: existingRoom, error: fetchError } = await supabaseGames
      .from('quiz_rooms')
      .select()
      .eq('code', code.toUpperCase())
      .single()

    if (fetchError) throw new Error('Room not found')
    if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

    const existingPlayer = existingRoom.players.find(p => p.id === playerId)
    if (existingPlayer) {
      saveRoomCode(existingRoom.code)
      updateURLWithRoomCode(existingRoom.code)
      setRoom(existingRoom)
      return existingRoom
    }

    const sessionToken = generateSessionToken()
    const isQuickMode = existingRoom.game_mode === 'quick'
    const updatedPlayers = [
      ...existingRoom.players,
      {
        id: playerId,
        name: profile.name || '', // Use saved name if available
        sessionToken,
        score: 0,
        hasAnswered: false,
        correctCount: 0,
        totalTime: 0,
        answerCount: 0,
        ...(isQuickMode && {
          availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          currentWager: null,
          wagerLocked: false
        })
      }
    ]

    const { data, error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: updatedPlayers })
      .eq('code', code.toUpperCase())
      .select()
      .single()

    if (updateError) throw updateError

    saveRoomCode(data.code)
    updateURLWithRoomCode(data.code)
    const myPlayer = data.players.find(p => p.id === playerId)
    if (myPlayer?.sessionToken) {
      updateURLWithSessionToken(myPlayer.sessionToken)
    }

    setRoom(data)
    return data
  } catch (err) {
    setError(err.message)
    return null
  } finally {
    setLoading(false)
  }
}, [playerId, profile.name])
```

**Step 7: Update startGame to validate names and build questions**

```javascript
const startGame = useCallback(async () => {
  if (!room || !isHost || room.phase !== 'lobby') return

  // Validate all players have names
  const unnamedPlayers = room.players.filter(p => !p.name || !p.name.trim())
  if (unnamedPlayers.length > 0) {
    setError('All players must enter their name before starting')
    return
  }

  if (room.players.length < 2) {
    setError('Need at least 2 players to start')
    return
  }

  // Build questions based on game mode
  const isQuickMode = room.game_mode === 'quick'
  let board = []
  let questions = []

  if (isQuickMode) {
    questions = getRandomQuestions(10)
    if (!questions || questions.length === 0) {
      setError('Failed to load questions. Please try again.')
      return
    }
  } else {
    const result = buildBoard()
    board = result.board
    if (!board || board.length === 0) {
      setError('Failed to load questions. Please try again.')
      return
    }
  }

  // Rest of startGame logic...
  // (existing code for starting wagering/picking phase)
}, [room, isHost, incrementGamesHosted])
```

**Step 8: Update return statement to include new actions**

Add to the return object:
```javascript
return {
  // ... existing returns
  setPlayerName,
  setGameMode,
  setCategory,
  allPlayersNamed: room?.players?.every(p => p.name && p.name.trim()) ?? false,
}
```

**Step 9: Commit**

```bash
git add src/games/quiz/hooks/useQuizRoom.js
git commit -m "feat(quiz): update hook for lobby-based configuration"
```

---

## Task 2: Rewrite Lobby Component

**Files:**
- Modify: `src/games/quiz/components/Lobby.jsx`

**Step 1: Import CATEGORIES and add state**

```javascript
import { useState, useCallback, useEffect } from 'react'
import { CATEGORIES } from '../data/hardcoded-questions'

// Theme/category options
const CATEGORY_OPTIONS = [
  { id: 'mixed', name: 'Mixed', icon: '🎲' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'history', name: 'History', icon: '📜' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'language', name: 'Language', icon: '📝' },
  { id: 'random', name: 'Random', icon: '🎯' }
]
```

**Step 2: Update component props and add local state**

```javascript
export function Lobby({
  room,
  isHost,
  playerId,
  currentPlayer,
  onStartGame,
  onLeave,
  onAddBot,
  onRemoveBot,
  onSetPlayerName,
  onSetGameMode,
  onSetCategory,
  allPlayersNamed,
  error,
  loading
}) {
  const [copied, setCopied] = useState(null)
  const [nameInput, setNameInput] = useState(currentPlayer?.name || '')
  const [nameSubmitted, setNameSubmitted] = useState(!!currentPlayer?.name)

  // Sync name input when currentPlayer changes (e.g., on rejoin)
  useEffect(() => {
    if (currentPlayer?.name) {
      setNameInput(currentPlayer.name)
      setNameSubmitted(true)
    }
  }, [currentPlayer?.name])
```

**Step 3: Add name submission handler**

```javascript
  const handleNameSubmit = useCallback(() => {
    if (nameInput.trim()) {
      onSetPlayerName(nameInput.trim())
      setNameSubmitted(true)
    }
  }, [nameInput, onSetPlayerName])

  const handleNameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }, [handleNameSubmit])
```

**Step 4: Update JSX with new layout**

```jsx
  const gameMode = room.game_mode || 'quick'
  const category = room.theme || { id: 'mixed', name: 'Mixed' }
  const canStart = room.players.length >= 2 && allPlayersNamed

  return (
    <div className="quiz-game quiz-lobby">
      {/* Header */}
      <div className="quiz-lobby__header">
        <button className="quiz-back" onClick={onLeave}>
          ← Leave
        </button>
        <div
          className={`quiz-room-code ${copied === 'code' ? 'quiz-room-code--copied' : ''}`}
          onClick={handleCopyCode}
          title="Click to copy code"
        >
          <span className="quiz-room-code__label">Room</span>
          <span className="quiz-room-code__code">{room.code}</span>
          <span className="quiz-room-code__icon">{copied === 'code' ? '✓' : '📋'}</span>
        </div>
      </div>

      {/* Error */}
      {error && <div className="quiz-error">{error}</div>}

      {/* Name Input */}
      <div className="quiz-lobby__name-section">
        <label className="quiz-label">Your Name</label>
        <div className="quiz-lobby__name-input-row">
          <input
            type="text"
            className="quiz-input"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value)
              setNameSubmitted(false)
            }}
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSubmit}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus={!nameSubmitted}
          />
          {nameSubmitted && nameInput.trim() && (
            <span className="quiz-lobby__name-check">✓</span>
          )}
        </div>
      </div>

      {/* Game Type Selection (Host Only) */}
      <div className="quiz-lobby__section">
        <label className="quiz-label">
          Game Type {!isHost && <span className="quiz-label--readonly">(host chooses)</span>}
        </label>
        <div className="quiz-lobby__mode-cards">
          <button
            className={`quiz-mode-card quiz-mode-card--compact ${gameMode === 'quick' ? 'quiz-mode-card--selected' : ''}`}
            onClick={() => isHost && onSetGameMode('quick')}
            disabled={!isHost}
          >
            <span className="quiz-mode-card__icon">⚡</span>
            <div className="quiz-mode-card__content">
              <span className="quiz-mode-card__title">Quick</span>
              <span className="quiz-mode-card__desc">10 rounds, wager points</span>
            </div>
          </button>
          <button
            className={`quiz-mode-card quiz-mode-card--compact ${gameMode === 'classic' ? 'quiz-mode-card--selected' : ''}`}
            onClick={() => isHost && onSetGameMode('classic')}
            disabled={!isHost}
          >
            <span className="quiz-mode-card__icon">📋</span>
            <div className="quiz-mode-card__content">
              <span className="quiz-mode-card__title">Classic</span>
              <span className="quiz-mode-card__desc">Pick from board</span>
            </div>
          </button>
        </div>
      </div>

      {/* Category Selection (Host Only) */}
      <div className="quiz-lobby__section">
        <label className="quiz-label">
          Category {!isHost && <span className="quiz-label--readonly">(host chooses)</span>}
        </label>
        <div className="quiz-lobby__categories">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat.id}
              className={`quiz-category-pill ${category.id === cat.id ? 'quiz-category-pill--selected' : ''}`}
              onClick={() => isHost && onSetCategory({ id: cat.id, name: cat.name })}
              disabled={!isHost}
            >
              <span className="quiz-category-pill__icon">{cat.icon}</span>
              <span className="quiz-category-pill__name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Players List */}
      <div className="quiz-lobby__section">
        <div className="quiz-lobby__players-header">
          <label className="quiz-label">Players</label>
          <span className="quiz-lobby__players-count">{room.players.length}</span>
        </div>
        <ul className="quiz-player-list">
          {room.players.map((player, index) => (
            <li
              key={player.id}
              className={`quiz-player ${player.isBot ? 'quiz-player--bot' : ''} ${!player.name ? 'quiz-player--unnamed' : ''}`}
            >
              <div className="quiz-player__avatar">
                {player.isBot ? '🤖' : player.name ? getInitials(player.name) : '?'}
              </div>
              <span className="quiz-player__name">
                {player.name || 'Entering name...'}
              </span>
              <div className="quiz-player__badges">
                {index === 0 && (
                  <span className="quiz-badge quiz-badge--host">Host</span>
                )}
                {player.isBot && (
                  <span className="quiz-badge quiz-badge--bot">Bot</span>
                )}
                {player.name && !player.isBot && (
                  <span className="quiz-player__ready">✓</span>
                )}
              </div>
              {isHost && player.isBot && (
                <button
                  className="quiz-player__remove"
                  onClick={() => onRemoveBot(player.id)}
                  title="Remove bot"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <button
            className="quiz-add-bot"
            onClick={onAddBot}
            disabled={loading || room.players.length >= 8}
          >
            + Add Bot
          </button>
        )}
      </div>

      {/* Share Link */}
      <div className="quiz-lobby__share">
        <button
          className={`quiz-share-link ${copied === 'link' ? 'quiz-share-link--copied' : ''}`}
          onClick={handleCopyLink}
        >
          <span className="quiz-share-link__icon">🔗</span>
          <span className="quiz-share-link__text">
            {copied === 'link' ? 'Link copied!' : 'Copy invite link'}
          </span>
        </button>
      </div>

      {/* Start Button */}
      <div className="quiz-lobby__actions">
        {isHost ? (
          <button
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            onClick={onStartGame}
            disabled={!canStart || loading}
          >
            {loading ? 'Starting...' : 'Start Game'}
          </button>
        ) : (
          <div className="quiz-lobby__waiting">
            Waiting for host to start...
          </div>
        )}
      </div>

      {isHost && !canStart && (
        <p className="quiz-lobby__hint">
          {room.players.length < 2 
            ? 'Need at least 2 players to start'
            : 'Waiting for all players to enter names'}
        </p>
      )}
    </div>
  )
}
```

**Step 5: Keep existing helper functions**

Keep `getRoomLink`, `copyToClipboard`, `handleCopyCode`, `handleCopyLink`, `getInitials` from the current implementation.

**Step 6: Commit**

```bash
git add src/games/quiz/components/Lobby.jsx
git commit -m "feat(quiz): rewrite Lobby with inline configuration"
```

---

## Task 3: Simplify QuizGame Component

**Files:**
- Modify: `src/games/quiz/QuizGame.jsx`

**Step 1: Simplify screen states**

Remove 'setup' screen, simplify flow:
- 'home' - Mode selection / create / join
- 'join' - Enter room code
- 'game' - Lobby and all game phases

**Step 2: Update imports and component**

```javascript
import { useState, useEffect } from 'react'
import './quiz.css'
import { useQuizRoom } from './hooks/useQuizRoom'
import { loadQuestionsCache, getCacheStatus } from './data/questions-db'
import { JoinRoom } from './components/JoinRoom'
import { Lobby } from './components/Lobby'
import { Board } from './components/Board'
import { WageringScreen } from './components/WageringScreen'
import { QuestionRound } from './components/QuestionRound'
import { RevealScreen } from './components/RevealScreen'
import { EndScreen } from './components/EndScreen'
// Remove: import { Setup } from './components/Setup'
```

**Step 3: Update component with simplified flow**

```javascript
export function QuizGame({ onBack }) {
  const [screen, setScreen] = useState('home')
  const [pendingRoomCode, setPendingRoomCode] = useState(null)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [cacheError, setCacheError] = useState(null)

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
    currentWager,
    wagerLocked,
    availableBoxes,
    playerWagers,
    roundNumber,
    allPlayersNamed,
    // Actions
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    startGame,
    setPlayerName,
    setGameMode,
    setCategory,
    selectWager,
    lockWager,
    addBot,
    removeBot,
    selectQuestion,
    submitAnswer,
    revealAnswers,
    continueGame,
    endGameEarly,
    playAgain
  } = useQuizRoom()

  // Load cache on mount
  useEffect(() => {
    const loadCache = async () => {
      setCacheLoading(true)
      const result = await loadQuestionsCache()
      if (!result.success) {
        setCacheError(result.error || 'Failed to load questions')
      }
      setCacheLoading(false)
    }
    loadCache()
  }, [])

  // Try rejoin on mount
  useEffect(() => {
    const attemptRejoin = async () => {
      const result = await tryRejoin()
      if (result) {
        if (result.needsJoin) {
          setPendingRoomCode(result.code)
          setScreen('join')
        } else {
          setScreen('game')
        }
      }
    }
    attemptRejoin()
  }, [tryRejoin])

  // Handle create room
  const handleCreateRoom = async () => {
    const newRoom = await createRoom()
    if (newRoom) {
      setScreen('game')
    }
  }

  // Handle join room
  const handleJoinRoom = async (code) => {
    const joinedRoom = await joinRoom(code)
    if (joinedRoom) {
      setScreen('game')
    }
  }

  // Handle leave
  const handleLeave = () => {
    leaveRoom()
    setScreen('home')
  }

  // Loading state
  if (cacheLoading) {
    return (
      <div className="quiz-game quiz-loading">
        <div className="quiz-loading__spinner" />
        <p className="quiz-loading__text">Loading questions...</p>
      </div>
    )
  }

  // Cache error
  if (cacheError) {
    return (
      <div className="quiz-game quiz-home">
        <button className="quiz-back" onClick={onBack}>← Back to Games</button>
        <div className="quiz-error" style={{ marginTop: '2rem' }}>
          Failed to load questions: {cacheError}
        </div>
        <button 
          className="quiz-btn quiz-btn--primary" 
          style={{ marginTop: '1rem' }}
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    )
  }

  // Home screen
  if (screen === 'home') {
    const status = getCacheStatus()
    
    return (
      <div className="quiz-game quiz-home">
        <button className="quiz-back" onClick={onBack}>← Back to Games</button>

        <div className="quiz-home__header">
          <h1 className="quiz-title">Quiz</h1>
          <p className="quiz-subtitle">Test your knowledge against friends</p>
          {status.loaded && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              {status.count.toLocaleString()} questions loaded
            </p>
          )}
        </div>

        <div className="quiz-home__actions">
          <button
            className="quiz-btn quiz-btn--primary quiz-btn--large"
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>

          <button
            className="quiz-btn quiz-btn--secondary quiz-btn--large"
            onClick={() => setScreen('join')}
          >
            Join Room
          </button>
        </div>

        {error && <div className="quiz-error">{error}</div>}
      </div>
    )
  }

  // Join screen
  if (screen === 'join') {
    return (
      <JoinRoom
        onBack={() => {
          setPendingRoomCode(null)
          setScreen('home')
        }}
        onJoinRoom={handleJoinRoom}
        loading={loading}
        error={error}
        initialCode={pendingRoomCode}
      />
    )
  }

  // Game screens
  if (screen === 'game' && room) {
    // Lobby
    if (room.phase === 'lobby') {
      return (
        <Lobby
          room={room}
          isHost={isHost}
          playerId={playerId}
          currentPlayer={currentPlayer}
          onStartGame={startGame}
          onLeave={handleLeave}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onSetPlayerName={setPlayerName}
          onSetGameMode={setGameMode}
          onSetCategory={setCategory}
          allPlayersNamed={allPlayersNamed}
          error={error}
          loading={loading}
        />
      )
    }

    // ... rest of game phases (picking, wagering, answering, reveal, ended)
    // Keep existing code for these phases
  }

  // Fallback
  return (
    <div className="quiz-game quiz-loading">
      <div className="quiz-loading__spinner" />
      <p className="quiz-loading__text">Loading...</p>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/games/quiz/QuizGame.jsx
git commit -m "feat(quiz): simplify QuizGame flow"
```

---

## Task 4: Simplify JoinRoom Component

**Files:**
- Modify: `src/games/quiz/components/JoinRoom.jsx`

**Step 1: Remove name input, just room code**

```javascript
import { useState, useEffect } from 'react'

export function JoinRoom({
  onBack,
  onJoinRoom,
  loading,
  error,
  initialCode
}) {
  const [code, setCode] = useState(initialCode || '')

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim()) {
      onJoinRoom(code.trim().toUpperCase())
    }
  }

  return (
    <div className="quiz-game quiz-join">
      <button className="quiz-back" onClick={onBack}>
        ← Back
      </button>

      <div className="quiz-join__header">
        <h1 className="quiz-title">Join Room</h1>
        <p className="quiz-subtitle">Enter a room code to join a game</p>
      </div>

      {error && <div className="quiz-error">{error}</div>}

      <form className="quiz-join__form" onSubmit={handleSubmit}>
        <div className="quiz-join__field">
          <label className="quiz-label" htmlFor="room-code">
            Room Code
          </label>
          <input
            id="room-code"
            type="text"
            className="quiz-input quiz-join__code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC12"
            maxLength={6}
            autoFocus
            required
          />
        </div>

        <div className="quiz-join__actions">
          <button
            type="submit"
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            disabled={!code.trim() || loading}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/components/JoinRoom.jsx
git commit -m "feat(quiz): simplify JoinRoom to code-only"
```

---

## Task 5: Delete Setup Component

**Files:**
- Delete: `src/games/quiz/components/Setup.jsx`

**Step 1: Remove the file**

```bash
rm src/games/quiz/components/Setup.jsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(quiz): remove unused Setup component"
```

---

## Task 6: Add CSS for New Lobby Elements

**Files:**
- Modify: `src/games/quiz/quiz.css`

**Step 1: Add styles for new lobby elements**

```css
/* Lobby Name Section */
.quiz-lobby__name-section {
  margin-bottom: 1.5rem;
}

.quiz-lobby__name-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quiz-lobby__name-input-row .quiz-input {
  flex: 1;
}

.quiz-lobby__name-check {
  color: var(--success);
  font-size: 1.25rem;
}

/* Lobby Sections */
.quiz-lobby__section {
  margin-bottom: 1.5rem;
}

.quiz-label--readonly {
  font-weight: normal;
  color: var(--text-muted);
  font-size: 0.85em;
}

/* Mode Cards Compact */
.quiz-lobby__mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.quiz-mode-card--compact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-mode-card--compact:hover:not(:disabled) {
  border-color: var(--primary);
}

.quiz-mode-card--compact.quiz-mode-card--selected {
  border-color: var(--primary);
  background: var(--primary-faint);
}

.quiz-mode-card--compact:disabled {
  cursor: default;
  opacity: 0.7;
}

.quiz-mode-card--compact .quiz-mode-card__icon {
  font-size: 1.5rem;
}

.quiz-mode-card--compact .quiz-mode-card__content {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.quiz-mode-card--compact .quiz-mode-card__title {
  font-weight: 600;
  font-size: 0.95rem;
}

.quiz-mode-card--compact .quiz-mode-card__desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Category Pills */
.quiz-lobby__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quiz-category-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 2rem;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.quiz-category-pill:hover:not(:disabled) {
  border-color: var(--primary);
}

.quiz-category-pill--selected {
  border-color: var(--primary);
  background: var(--primary-faint);
  color: var(--primary);
}

.quiz-category-pill:disabled {
  cursor: default;
  opacity: 0.7;
}

.quiz-category-pill__icon {
  font-size: 1rem;
}

/* Player unnamed state */
.quiz-player--unnamed {
  opacity: 0.6;
}

.quiz-player--unnamed .quiz-player__name {
  font-style: italic;
}

.quiz-player__ready {
  color: var(--success);
  margin-left: auto;
}

/* Lobby waiting text */
.quiz-lobby__waiting {
  text-align: center;
  padding: 1rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-radius: 0.5rem;
}

/* Home actions */
.quiz-home__actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}
```

**Step 2: Commit**

```bash
git add src/games/quiz/quiz.css
git commit -m "style(quiz): add CSS for new lobby elements"
```

---

## Task 7: Final Testing & Cleanup

**Step 1: Run build to verify no errors**

```bash
npm run build
```

**Step 2: Manual testing checklist**

- [ ] Create room works without name
- [ ] Name input in lobby saves correctly
- [ ] Game mode toggle works for host
- [ ] Category selection works for host
- [ ] Non-host sees but cannot change settings
- [ ] Start button disabled until all players named
- [ ] Join via code works
- [ ] Join via link works
- [ ] Bot addition still works
- [ ] Quick mode game flow works
- [ ] Classic mode game flow works

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(quiz): address testing feedback"
```

---

Plan complete and saved to `docs/plans/2026-02-01-quiz-lobby-redesign.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?