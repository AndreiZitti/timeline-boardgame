import { useState, useEffect } from 'react'
import './quiz.css'
import { useQuizRoom } from './hooks/useQuizRoom'
import { CreateRoom } from './components/CreateRoom'
import { JoinRoom } from './components/JoinRoom'
import { Lobby } from './components/Lobby'
import { Board } from './components/Board'
import { QuestionRound } from './components/QuestionRound'
import { RevealScreen } from './components/RevealScreen'
import { EndScreen } from './components/EndScreen'

export function QuizGame({ onBack }) {
  const [screen, setScreen] = useState('home')
  const [pendingRoomCode, setPendingRoomCode] = useState(null)

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
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    selectPack,
    startGame,
    selectQuestion,
    submitAnswer,
    revealAnswers,
    continueGame,
    endGameEarly,
    playAgain
  } = useQuizRoom()

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
  const handleCreateRoom = async (name) => {
    const newRoom = await createRoom(name)
    if (newRoom) {
      setScreen('game')
    }
  }

  // Handle joining room
  const handleJoinRoom = async (code, name) => {
    const joinedRoom = await joinRoom(code, name)
    if (joinedRoom) {
      setScreen('game')
    }
  }

  // Handle leaving
  const handleLeave = () => {
    leaveRoom()
    setScreen('home')
  }

  // Home screen
  if (screen === 'home') {
    return (
      <div className="screen quiz-home">
        <button className="btn-back" onClick={onBack}>
          &larr; Back to Games
        </button>

        <h1>QUIZ</h1>
        <p className="subtitle">Race to answer. Fastest correct wins the most!</p>

        <div className="how-to-play">
          <ul>
            <li>6 categories with 5 questions each (100-500 points)</li>
            <li>Everyone answers each question within 60 seconds</li>
            <li>Fastest correct answer gets full points, slower ones get less</li>
            <li>Winner of each round picks the next question</li>
            <li>Clear the board to win!</li>
          </ul>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => setScreen('create')}>
            Create Room
          </button>
          <button className="btn btn-secondary" onClick={() => setScreen('join')}>
            Join Room
          </button>
        </div>
      </div>
    )
  }

  // Create room screen
  if (screen === 'create') {
    return (
      <CreateRoom
        onBack={() => setScreen('home')}
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
        onBack={() => setScreen('home')}
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
          isHost={isHost}
          onSelectPack={selectPack}
          onStartGame={startGame}
          onLeave={handleLeave}
          error={error}
          loading={loading}
        />
      )
    }

    // Picking phase
    if (room.phase === 'picking') {
      return (
        <Board
          room={room}
          categories={categories}
          isPicker={isPicker}
          onSelectQuestion={selectQuestion}
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
        />
      )
    }

    // Reveal phase
    if (room.phase === 'reveal' && currentQuestion) {
      return (
        <RevealScreen
          room={room}
          currentQuestion={currentQuestion}
          onContinue={continueGame}
        />
      )
    }

    // Ended phase
    if (room.phase === 'ended') {
      return (
        <EndScreen
          room={room}
          isHost={isHost}
          onPlayAgain={playAgain}
          onLeave={handleLeave}
        />
      )
    }
  }

  // Fallback / Loading
  return (
    <div className="screen quiz-loading">
      <p>Loading...</p>
    </div>
  )
}

export default QuizGame
