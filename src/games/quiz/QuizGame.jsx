import { useState, useEffect } from 'react'
import './quiz.css'
import { useQuizRoom } from './hooks/useQuizRoom'
import { loadQuestionsCache, getCacheStatus } from './data/questions-db'
import { Setup } from './components/Setup'
import { JoinRoom } from './components/JoinRoom'
import { Lobby } from './components/Lobby'
import { Board } from './components/Board'
import { WageringScreen } from './components/WageringScreen'
import { QuestionRound } from './components/QuestionRound'
import { RevealScreen } from './components/RevealScreen'
import { EndScreen } from './components/EndScreen'

export function QuizGame({ onBack }) {
  const [screen, setScreen] = useState('home')
  const [gameMode, setGameMode] = useState(null)
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
    // Quick mode specific
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
          setGameMode('quick') // game_mode column not in DB yet
          setScreen('game')
        }
      }
    }
    attemptRejoin()
  }, [tryRejoin])

  // Handle mode selection
  const handleSelectMode = (mode) => {
    setGameMode(mode)
    setScreen('setup')
  }

  // Handle room creation
  const handleCreateRoom = async (name, theme) => {
    const newRoom = await createRoom(name, gameMode, theme)
    if (newRoom) {
      setScreen('game')
    }
  }

  // Handle joining room
  const handleJoinRoom = async (code, name) => {
    const joinedRoom = await joinRoom(code, name)
    if (joinedRoom) {
      setGameMode('quick') // game_mode column not in DB yet
      setScreen('game')
    }
  }

  // Handle leaving
  const handleLeave = () => {
    leaveRoom()
    setGameMode(null)
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

  // Home screen with mode selection
  if (screen === 'home') {
    const status = getCacheStatus()
    
    return (
      <div className="quiz-game quiz-home">
        <button className="quiz-back" onClick={onBack}>
          ← Back to Games
        </button>

        <div className="quiz-home__header">
          <h1 className="quiz-title">Quiz</h1>
          <p className="quiz-subtitle">Test your knowledge against friends</p>
          {status.loaded && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              {status.count.toLocaleString()} questions loaded
            </p>
          )}
        </div>

        <div className="quiz-home__modes">
          <button
            className="quiz-mode-card"
            onClick={() => handleSelectMode('quick')}
          >
            <div className="quiz-mode-card__icon">⚡</div>
            <div className="quiz-mode-card__content">
              <h3 className="quiz-mode-card__title">Quick Game</h3>
              <p className="quiz-mode-card__desc">5 rapid-fire questions, fast pace</p>
            </div>
            <span className="quiz-mode-card__arrow">→</span>
          </button>

          {/* Classic Game - hidden for now
          <button
            className="quiz-mode-card"
            onClick={() => handleSelectMode('classic')}
          >
            <div className="quiz-mode-card__icon">📋</div>
            <div className="quiz-mode-card__content">
              <h3 className="quiz-mode-card__title">Classic Game</h3>
              <p className="quiz-mode-card__desc">Full board, pick your questions</p>
            </div>
            <span className="quiz-mode-card__arrow">→</span>
          </button>
          */}

          <button
            className="quiz-mode-card"
            onClick={() => setScreen('join')}
          >
            <div className="quiz-mode-card__icon">🚪</div>
            <div className="quiz-mode-card__content">
              <h3 className="quiz-mode-card__title">Join Room</h3>
              <p className="quiz-mode-card__desc">Enter a room code to join</p>
            </div>
            <span className="quiz-mode-card__arrow">→</span>
          </button>
        </div>
      </div>
    )
  }

  // Setup screen (create room)
  if (screen === 'setup') {
    return (
      <Setup
        gameMode={gameMode}
        onBack={() => {
          setGameMode(null)
          setScreen('home')
        }}
        onCreateRoom={handleCreateRoom}
        loading={loading}
        error={error}
        savedName={savedName}
      />
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
        savedName={savedName}
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
          gameMode={gameMode}
          isHost={isHost}
          onStartGame={startGame}
          onLeave={handleLeave}
          onAddBot={addBot}
          onRemoveBot={removeBot}
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
