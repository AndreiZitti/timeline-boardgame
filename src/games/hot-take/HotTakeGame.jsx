import { useState, useEffect } from 'react'
import './hot-take.css'
import { useRoom } from './hooks/useRoom'
import { Lobby } from './components/Lobby'
import { NumberReveal } from './components/NumberReveal'
import { HiddenScreen } from './components/HiddenScreen'
import { RevealScreen } from './components/RevealScreen'
import { GameBoard } from './components/GameBoard'
import { SingleDeviceSetup } from './components/SingleDeviceSetup'
import { PassAndPlay } from './components/PassAndPlay'
import { SingleDeviceBoard } from './components/SingleDeviceBoard'

// Generate unique random numbers for single device mode
function generateNumbers(count) {
  const numbers = []
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * 100) + 1
    if (!numbers.includes(num)) {
      numbers.push(num)
    }
  }
  return numbers
}

export function HotTakeGame({ onBack, savedName: initialName, onUpdateName }) {
  const [screen, setScreen] = useState('home')
  const [joinCode, setJoinCode] = useState('')

  // Single device mode state
  const [singleDeviceGame, setSingleDeviceGame] = useState(null)
  const [singleDevicePhase, setSingleDevicePhase] = useState('setup') // 'setup' | 'passplay' | 'board' | 'revealed'

  const {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    savedName,
    createRoom,
    joinRoom,
    tryRejoin,
    setCategory,
    setMode,
    startRound,
    toggleHidden,
    updateSlot,
    revealNumbers,
    nextRound,
    leaveRoom,
    updateMyName,
    updateProfileName
  } = useRoom()

  // Try to rejoin on mount
  useEffect(() => {
    const attemptRejoin = async () => {
      const result = await tryRejoin()
      if (result) {
        if (result.needsJoin) {
          // Join the room directly (name will be entered in lobby)
          const joined = await joinRoom(result.code)
          if (joined) {
            setScreen('game')
          }
        } else {
          setScreen('game')
        }
      }
    }
    attemptRejoin()
  }, [tryRejoin, joinRoom])

  // Handle room creation
  const handleCreateRoom = async () => {
    const newRoom = await createRoom()
    if (newRoom) {
      setScreen('game')
    }
  }

  // Handle joining room
  const handleJoinRoom = async () => {
    if (joinCode.length !== 5) return
    const joinedRoom = await joinRoom(joinCode)
    if (joinedRoom) {
      setJoinCode('')
      setScreen('game')
    }
  }

  // Handle leaving
  const handleLeave = () => {
    leaveRoom()
    setScreen('home')
  }

  // Handle back to game hub
  const handleBackToHub = () => {
    leaveRoom()
    onBack()
  }

  // Single device handlers
  const handleStartSingleDevice = (playerNames, category) => {
    const numbers = generateNumbers(playerNames.length)
    const players = playerNames.map((name, i) => ({
      id: `player-${i}`,
      name,
      number: numbers[i],
      slot: null
    }))

    setSingleDeviceGame({
      players,
      category,
      round: 1
    })
    setSingleDevicePhase('passplay')
  }

  const handleAllSeen = () => {
    setSingleDevicePhase('board')
  }

  const handleSingleDeviceReveal = () => {
    setSingleDevicePhase('revealed')
  }

  const handleSingleDeviceNextRound = () => {
    // Go back to setup for new category selection (keep player names)
    setSingleDevicePhase('setup')
  }

  const handleLeaveSingleDevice = () => {
    setSingleDeviceGame(null)
    setSingleDevicePhase('setup')
    setScreen('home')
  }

  // Hot Take home screen (create/join/single device)
  if (screen === 'home') {
    return (
      <div className="screen hot-take-home">
        <button className="btn-back" onClick={onBack}>
          &larr; Back to Games
        </button>

        <h1>HOT TAKE</h1>
        <p className="subtitle">Where do you stand?</p>

        <div className="how-to-play">
          <ul>
            <li>Everyone gets a secret number (1-100)</li>
            <li>A theme is announced — like "scary things"</li>
            <li>Describe your number using that theme — no numbers allowed!</li>
            <li>Arrange everyone from lowest to highest based on descriptions alone</li>
          </ul>
        </div>

        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>

          <div className="join-input-group">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="Room code"
              maxLength={5}
              disabled={loading}
            />
            <button
              className="btn btn-join"
              onClick={handleJoinRoom}
              disabled={joinCode.length !== 5 || loading}
            >
              Join
            </button>
          </div>

          <button className="btn btn-secondary" onClick={() => setScreen('single-device')}>
            Single Device
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
      </div>
    )
  }

  // Single device mode screens
  if (screen === 'single-device') {
    // Setup screen
    if (singleDevicePhase === 'setup' || !singleDeviceGame) {
      return (
        <SingleDeviceSetup
          onBack={() => {
            setSingleDeviceGame(null)
            setSingleDevicePhase('setup')
            setScreen('home')
          }}
          onStartGame={handleStartSingleDevice}
          initialPlayerNames={singleDeviceGame?.players?.map(p => p.name)}
        />
      )
    }

    // Pass and play - show numbers one by one
    if (singleDevicePhase === 'passplay') {
      return (
        <PassAndPlay
          players={singleDeviceGame.players}
          category={singleDeviceGame.category}
          onAllSeen={handleAllSeen}
        />
      )
    }

    // Board screen - arrange cards
    if (singleDevicePhase === 'board') {
      return (
        <SingleDeviceBoard
          players={singleDeviceGame.players}
          category={singleDeviceGame.category}
          onReveal={handleSingleDeviceReveal}
          onNextRound={handleSingleDeviceNextRound}
          onLeave={handleLeaveSingleDevice}
          isRevealed={false}
        />
      )
    }

    // Revealed screen
    if (singleDevicePhase === 'revealed') {
      return (
        <SingleDeviceBoard
          players={singleDeviceGame.players}
          category={singleDeviceGame.category}
          onReveal={handleSingleDeviceReveal}
          onNextRound={handleSingleDeviceNextRound}
          onLeave={handleLeaveSingleDevice}
          isRevealed={true}
        />
      )
    }
  }

  // Game screens (based on room phase)
  if (screen === 'game' && room) {
    // Lobby phase
    if (room.phase === 'lobby') {
      return (
        <Lobby
          room={room}
          isHost={isHost}
          currentPlayer={currentPlayer}
          onSetCategory={setCategory}
          onSetMode={setMode}
          onStartRound={startRound}
          onLeave={handleLeave}
          onUpdateName={updateMyName}
        />
      )
    }

    // Playing phase
    if (room.phase === 'playing') {
      const isRemoteMode = room.mode === 'remote'

      // Remote mode - show the game board
      if (isRemoteMode) {
        return (
          <GameBoard
            players={room.players}
            currentPlayer={currentPlayer}
            playerId={playerId}
            category={room.category}
            phase={room.phase}
            isHost={isHost}
            onUpdateSlot={updateSlot}
            onToggleHidden={toggleHidden}
            onReveal={revealNumbers}
            onNextRound={nextRound}
            onLeave={handleLeave}
          />
        )
      }

      // Table mode - show number or hidden screen based on player's hidden state
      if (currentPlayer && !currentPlayer.hidden) {
        return (
          <NumberReveal
            number={currentPlayer.number}
            category={room.category}
            onHide={toggleHidden}
          />
        )
      }

      return (
        <HiddenScreen
          category={room.category}
          playerName={currentPlayer?.name}
          isHost={isHost}
          onPeek={toggleHidden}
          onReveal={revealNumbers}
        />
      )
    }

    // Revealed phase
    if (room.phase === 'revealed') {
      // In remote mode, show the board with revealed numbers
      if (room.mode === 'remote') {
        return (
          <GameBoard
            players={room.players}
            currentPlayer={currentPlayer}
            playerId={playerId}
            category={room.category}
            phase={room.phase}
            isHost={isHost}
            onUpdateSlot={updateSlot}
            onToggleHidden={toggleHidden}
            onNextRound={nextRound}
            onLeave={handleLeave}
          />
        )
      }

      return (
        <RevealScreen
          room={room}
          isHost={isHost}
          onNextRound={nextRound}
          onLeave={handleLeave}
        />
      )
    }
  }

  // Fallback
  return (
    <div className="screen">
      <p>Loading...</p>
    </div>
  )
}
