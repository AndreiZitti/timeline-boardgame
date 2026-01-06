import { useState, useEffect } from 'react'
import './codenames.css'
import { useCodenamesRoom } from './hooks/useCodenamesRoom'
import { CreateRoom } from './components/CreateRoom'
import { JoinRoom } from './components/JoinRoom'
import { Lobby } from './components/Lobby'
import { TeamSetup } from './components/TeamSetup'
import { SpymasterView } from './components/SpymasterView'
import { OperativeView } from './components/OperativeView'
import { EndScreen } from './components/EndScreen'

export function CodenamesGame({ onBack }) {
  const [screen, setScreen] = useState('home')
  const [pendingRoomCode, setPendingRoomCode] = useState(null)

  const {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    myTeam,
    isSpymaster,
    isMyTurn,
    redTeam,
    blueTeam,
    unassigned,
    savedName,
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    joinTeam,
    leaveTeam,
    setLanguage,
    startTeamSetup,
    becomeSpymaster,
    removeSpymaster,
    startGame,
    giveClue,
    revealCard,
    endGuessing,
    playAgain,
    getCardType
  } = useCodenamesRoom()

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

  // Handle back to game hub
  const handleBackToHub = () => {
    leaveRoom()
    onBack()
  }

  // Home screen
  if (screen === 'home') {
    return (
      <div className="screen codenames-home">
        <button className="btn-back" onClick={onBack}>
          &larr; Back to Games
        </button>

        <h1>CODENAMES</h1>
        <p className="subtitle">Find your agents. Avoid the assassin.</p>

        <div className="how-to-play">
          <ul>
            <li>Two teams compete — Red vs Blue — each with a Spymaster</li>
            <li>Only Spymasters see which words belong to which team</li>
            <li>Give one-word clues to help your team guess the right words</li>
            <li>First team to find all their agents wins — but hit the Assassin and you lose!</li>
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
    // Lobby phase - team selection
    if (room.phase === 'lobby') {
      return (
        <Lobby
          room={room}
          playerId={playerId}
          isHost={isHost}
          myTeam={myTeam}
          redTeam={redTeam}
          blueTeam={blueTeam}
          unassigned={unassigned}
          onJoinTeam={joinTeam}
          onLeaveTeam={leaveTeam}
          onSetLanguage={setLanguage}
          onStartTeamSetup={startTeamSetup}
          onLeave={handleLeave}
          error={error}
        />
      )
    }

    // Team setup phase - spymaster selection
    if (room.phase === 'team-setup') {
      return (
        <TeamSetup
          room={room}
          playerId={playerId}
          isHost={isHost}
          myTeam={myTeam}
          redTeam={redTeam}
          blueTeam={blueTeam}
          onBecomeSpymaster={becomeSpymaster}
          onRemoveSpymaster={removeSpymaster}
          onStartGame={startGame}
          onLeave={handleLeave}
          error={error}
        />
      )
    }

    // Playing phase
    if (room.phase === 'playing') {
      // Spymaster view - shows key card overlay
      if (isSpymaster) {
        return (
          <SpymasterView
            room={room}
            playerId={playerId}
            isMyTurn={isMyTurn}
            myTeam={myTeam}
            redTeam={redTeam}
            blueTeam={blueTeam}
            onGiveClue={giveClue}
            onLeave={handleLeave}
            getCardType={getCardType}
          />
        )
      }

      // Operative view - guessing UI
      return (
        <OperativeView
          room={room}
          playerId={playerId}
          isMyTurn={isMyTurn}
          myTeam={myTeam}
          redTeam={redTeam}
          blueTeam={blueTeam}
          onRevealCard={revealCard}
          onEndGuessing={endGuessing}
          onLeave={handleLeave}
          getCardType={getCardType}
        />
      )
    }

    // Ended phase
    if (room.phase === 'ended') {
      return (
        <EndScreen
          room={room}
          isHost={isHost}
          myTeam={myTeam}
          redTeam={redTeam}
          blueTeam={blueTeam}
          onPlayAgain={playAgain}
          onLeave={handleLeave}
          getCardType={getCardType}
        />
      )
    }
  }

  // Fallback / Loading
  return (
    <div className="screen codenames-loading">
      <p>Loading...</p>
    </div>
  )
}

export default CodenamesGame
