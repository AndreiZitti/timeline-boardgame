import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './like-minded.css'
// Single device mode
import { useGameState } from './hooks/useGameState'
import { Setup } from './components/Setup'
import { PsychicScreen } from './components/PsychicScreen'
import { GuessScreen } from './components/GuessScreen'
import { RevealScreen } from './components/RevealScreen'
import { ResultsScreen } from './components/ResultsScreen'
// Multiplayer mode
import { useWavelengthRoom } from './hooks/useWavelengthRoom'
import {
  RoomLobby,
  PsychicView,
  GuesserView,
  RevealView,
  WaitingScreen,
  EndScreen
} from './components/multiplayer'

export function LikeMindedGame({ onBack }) {
  // Mode: 'home' | 'single-setup' | 'single-playing' | 'mp-game'
  const [mode, setMode] = useState('home')
  const [joinCode, setJoinCode] = useState('')

  // Single device state
  const singleDevice = useGameState()

  // Multiplayer state
  const multiplayer = useWavelengthRoom()

  // Try to rejoin multiplayer room on mount
  useEffect(() => {
    const tryRejoin = async () => {
      const room = await multiplayer.tryRejoin()
      if (room) {
        setMode('mp-game')
      }
    }
    tryRejoin()
  }, [])

  // === SINGLE DEVICE HANDLERS ===
  const handleStartSingleGame = (playerNames) => {
    singleDevice.startGame(playerNames)
    setMode('single-playing')
  }

  const handleSingleExit = () => {
    singleDevice.resetGame()
    setMode('home')
  }

  const handleSinglePlayAgain = () => {
    singleDevice.playAgain()
  }

  // === MULTIPLAYER HANDLERS ===
  const handleCreateRoom = async () => {
    const room = await multiplayer.createRoom()
    if (room) {
      setMode('mp-game')
    }
  }

  const handleJoinRoom = async () => {
    if (joinCode.length !== 4) return
    const room = await multiplayer.joinRoom(joinCode)
    if (room) {
      setJoinCode('')
      setMode('mp-game')
    }
  }

  const handleLeaveRoom = async () => {
    await multiplayer.leaveRoom()
    setMode('home')
  }

  // === HOME SCREEN ===
  if (mode === 'home') {
    return (
      <motion.div
        className="screen like-minded-home"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button className="btn-back" onClick={onBack}>
          &larr; Back to Games
        </button>

        <motion.h1
          className="like-minded-title"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          LIKE MINDED
        </motion.h1>
        <motion.p
          className="subtitle"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Can you find the wavelength?
        </motion.p>

        <motion.div
          className="how-to-play"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ul>
            <li>One player is the Psychic and sees a hidden target on a spectrum</li>
            <li>The Psychic gives a clue to help the team</li>
            <li>The team moves the slider to guess the target&apos;s location</li>
            <li>Score points based on how close you get - beat the game!</li>
          </ul>
        </motion.div>

        <motion.div
          className="button-group"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            className="btn btn-primary"
            onClick={handleCreateRoom}
            disabled={multiplayer.loading}
          >
            {multiplayer.loading ? 'Creating...' : 'Create Room'}
          </button>

          <div className="join-input-group">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="Room code"
              maxLength={4}
              disabled={multiplayer.loading}
            />
            <button
              className="btn btn-join"
              onClick={handleJoinRoom}
              disabled={joinCode.length !== 4 || multiplayer.loading}
            >
              Join
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setMode('single-setup')}
          >
            Single Device
          </button>
        </motion.div>

        {multiplayer.error && <p className="error-message">{multiplayer.error}</p>}
      </motion.div>
    )
  }

  // === SINGLE DEVICE: SETUP ===
  if (mode === 'single-setup') {
    return (
      <Setup
        onStartGame={handleStartSingleGame}
        onBack={() => setMode('home')}
      />
    )
  }

  // === SINGLE DEVICE: PLAYING ===
  if (mode === 'single-playing') {
    const {
      phase,
      players,
      currentPsychic,
      currentPsychicIndex,
      teamScore,
      gameScore,
      currentRound,
      roundHistory,
      submitClue,
      updateGuess,
      lockInGuess,
      finishReveal
    } = singleDevice

    return (
      <AnimatePresence mode="wait">
        {phase === 'psychic' && (
          <PsychicScreen
            key="psychic"
            psychicName={currentPsychic?.name}
            spectrum={currentRound.spectrum}
            targetPosition={currentRound.targetPosition}
            roundNumber={currentPsychicIndex + 1}
            totalRounds={players.length}
            teamScore={teamScore}
            gameScore={gameScore}
            onSubmitClue={submitClue}
          />
        )}

        {phase === 'guess' && (
          <GuessScreen
            key="guess"
            psychicName={currentPsychic?.name}
            spectrum={currentRound.spectrum}
            clue={currentRound.clue}
            guessPosition={currentRound.guessPosition}
            roundNumber={currentPsychicIndex + 1}
            totalRounds={players.length}
            teamScore={teamScore}
            gameScore={gameScore}
            onUpdateGuess={updateGuess}
            onLockIn={lockInGuess}
          />
        )}

        {phase === 'reveal' && (
          <RevealScreen
            key="reveal"
            psychicName={currentPsychic?.name}
            spectrum={currentRound.spectrum}
            targetPosition={currentRound.targetPosition}
            guessPosition={currentRound.guessPosition}
            clue={currentRound.clue}
            result={currentRound.result}
            roundNumber={currentPsychicIndex + 1}
            totalRounds={players.length}
            teamScore={teamScore}
            gameScore={gameScore}
            onContinue={finishReveal}
          />
        )}

        {phase === 'results' && (
          <ResultsScreen
            key="results"
            teamScore={teamScore}
            gameScore={gameScore}
            roundHistory={roundHistory}
            onPlayAgain={handleSinglePlayAgain}
            onExit={handleSingleExit}
          />
        )}
      </AnimatePresence>
    )
  }

  // === MULTIPLAYER: GAME ===
  if (mode === 'mp-game' && multiplayer.room) {
    const {
      room,
      players,
      currentPlayer,
      currentPsychic,
      isHost,
      isPsychic,
      psychicIndex,
      startGame,
      submitClue,
      lockInGuess,
      nextPsychic,
      playAgain,
      updateMyName
    } = multiplayer

    // Lobby phase
    if (room.phase === 'lobby') {
      return (
        <RoomLobby
          roomCode={room.code}
          players={players}
          currentPlayer={currentPlayer}
          isHost={isHost}
          onStartGame={startGame}
          onLeave={handleLeaveRoom}
          onUpdateName={updateMyName}
        />
      )
    }

    // Psychic phase
    if (room.phase === 'psychic') {
      if (isPsychic) {
        return (
          <PsychicView
            spectrum={room.spectrum}
            targetPosition={room.target}
            roundNumber={psychicIndex + 1}
            totalRounds={players.length}
            teamScore={room.team_score}
            gameScore={room.game_score}
            onSubmitClue={submitClue}
          />
        )
      } else {
        return (
          <WaitingScreen
            psychicName={currentPsychic?.name}
            roundNumber={psychicIndex + 1}
            totalRounds={players.length}
            teamScore={room.team_score}
            gameScore={room.game_score}
            spectrum={room.spectrum}
          />
        )
      }
    }

    // Guessing phase
    if (room.phase === 'guessing') {
      return (
        <GuesserView
          spectrum={room.spectrum}
          clue={room.clue}
          psychicName={currentPsychic?.name}
          roundNumber={psychicIndex + 1}
          totalRounds={players.length}
          teamScore={room.team_score}
          gameScore={room.game_score}
          isPsychic={isPsychic}
          onLockIn={lockInGuess}
        />
      )
    }

    // Reveal phase
    if (room.phase === 'reveal') {
      const isLastRound = psychicIndex === players.length - 1
      return (
        <RevealView
          spectrum={room.spectrum}
          targetPosition={room.target}
          guessPosition={room.guess}
          clue={room.clue}
          psychicName={currentPsychic?.name}
          roundNumber={psychicIndex + 1}
          totalRounds={players.length}
          teamScore={room.team_score}
          gameScore={room.game_score}
          isHost={isHost}
          isLastRound={isLastRound}
          onNextPsychic={nextPsychic}
        />
      )
    }

    // End phase
    if (room.phase === 'end') {
      return (
        <EndScreen
          teamScore={room.team_score}
          gameScore={room.game_score}
          isHost={isHost}
          onPlayAgain={playAgain}
          onLeave={handleLeaveRoom}
        />
      )
    }
  }

  // Fallback / Loading
  return (
    <div className="screen">
      <p>Loading...</p>
    </div>
  )
}
