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
    // Quick mode specific
    currentWager,
    wagerLocked,
    availableBoxes,
    playerWagers,
    roundNumber,
    // New items from hook
    allPlayersNamed,
    setPlayerName,
    setGameMode,
    setCategory,
    // Actions
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    startGame,
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

  // Load questions cache on mount
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

  // Try to rejoin on mount
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

  // Handle room creation
  const handleCreateRoom = async () => {
    const newRoom = await createRoom()
    if (newRoom) {
      setScreen('game')
    }
  }

  // Handle joining room
  const handleJoinRoom = async (code) => {
    const joinedRoom = await joinRoom(code)
    if (joinedRoom) {
      setScreen('game')
    }
  }

  // Handle leaving
  const handleLeave = () => {
    leaveRoom()
    setScreen('home')
  }

  // Show loading while cache loads
  if (cacheLoading) {
    return (
      <div className="quiz-game quiz-loading">
        <div className="quiz-loading__spinner" />
        <p className="quiz-loading__text">Loading questions...</p>
      </div>
    )
  }

  // Show error if cache failed
  if (cacheError) {
    return (
      <div className="quiz-game quiz-home">
        <button className="quiz-back" onClick={onBack}>
          ← Back to Games
        </button>
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

  // Home screen with Create Room / Join Room buttons
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

  // Join room screen
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

  // Game screens (based on room phase)
  if (screen === 'game' && room) {
    // Lobby phase
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

    // Picking phase (classic mode)
    if (room.phase === 'picking') {
      return (
        <Board
          room={room}
          categories={categories}
          isPicker={isPicker}
          sortedPlayers={sortedPlayers}
          onSelectQuestion={selectQuestion}
          isHost={isHost}
          onEndGame={endGameEarly}
        />
      )
    }

    // Wagering phase (quick mode)
    if (room.phase === 'wagering') {
      return (
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
          isHost={isHost}
          onEndGame={endGameEarly}
        />
      )
    }

    // Answering phase
    if (room.phase === 'answering' && currentQuestion) {
      return (
        <QuestionRound
          room={room}
          currentQuestion={currentQuestion}
          timeRemaining={timeRemaining}
          hasAnswered={hasAnswered}
          onSubmitAnswer={submitAnswer}
          isHost={isHost}
          onEndGame={endGameEarly}
        />
      )
    }

    // Reveal phase
    if (room.phase === 'reveal' && currentQuestion) {
      return (
        <RevealScreen
          room={room}
          currentQuestion={currentQuestion}
          isHost={isHost}
          onContinue={continueGame}
        />
      )
    }

    // Ended phase
    if (room.phase === 'ended') {
      return (
        <EndScreen
          room={room}
          sortedPlayers={sortedPlayers}
          isHost={isHost}
          onPlayAgain={playAgain}
          onLeave={handleLeave}
        />
      )
    }
  }

  // Fallback / Loading
  return (
    <div className="quiz-game quiz-loading">
      <div className="quiz-loading__spinner" />
      <p className="quiz-loading__text">Loading...</p>
    </div>
  )
}

export default QuizGame
