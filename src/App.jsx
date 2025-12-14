import { useState, useEffect } from 'react'
import { useRoom } from './hooks/useRoom'
import { Home } from './components/Home'
import { CreateRoom } from './components/CreateRoom'
import { JoinRoom } from './components/JoinRoom'
import { Lobby } from './components/Lobby'
import { NumberReveal } from './components/NumberReveal'
import { HiddenScreen } from './components/HiddenScreen'
import { RevealScreen } from './components/RevealScreen'
import { GameBoard } from './components/GameBoard'
import { Profile } from './components/Profile'

// Screen states: 'home' | 'create' | 'join' | 'game'
function App() {
  const [screen, setScreen] = useState('home')
  const [pendingRoomCode, setPendingRoomCode] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    savedName,
    profile,
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
    updateProfileName
  } = useRoom()

  // Try to rejoin on mount
  useEffect(() => {
    const attemptRejoin = async () => {
      const result = await tryRejoin()
      if (result) {
        if (result.needsJoin) {
          // URL has room code but we're not in it - go to join screen
          setPendingRoomCode(result.code)
          setScreen('join')
        } else {
          // Successfully rejoined
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

  // Render home screen
  if (screen === 'home') {
    return (
      <>
        <Home
          onCreateRoom={() => setScreen('create')}
          onJoinRoom={() => setScreen('join')}
          onOpenProfile={() => setShowProfile(true)}
          playerName={savedName}
        />
        <Profile
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          profile={profile}
          onUpdateName={updateProfileName}
        />
      </>
    )
  }

  // Render create room screen
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

  // Render join room screen
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
          onSetCategory={setCategory}
          onSetMode={setMode}
          onStartRound={startRound}
          onLeave={handleLeave}
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
            onConfirm={confirmPosition}
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

export default App
