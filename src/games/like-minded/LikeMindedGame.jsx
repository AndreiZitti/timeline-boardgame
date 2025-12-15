import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameState } from './hooks/useGameState'
import { Setup } from './components/Setup'
import { PsychicScreen } from './components/PsychicScreen'
import { GuessScreen } from './components/GuessScreen'
import { RevealScreen } from './components/RevealScreen'
import { ResultsScreen } from './components/ResultsScreen'

export function LikeMindedGame({ onBack }) {
  const [screen, setScreen] = useState('home') // 'home' | 'setup' | 'playing'

  const {
    phase,
    players,
    currentPsychic,
    currentPsychicIndex,
    playerScore,
    gameScore,
    currentRound,
    roundHistory,
    startGame,
    submitClue,
    updateGuess,
    lockInGuess,
    finishReveal,
    playAgain,
    resetGame
  } = useGameState()

  const handleStartGame = (playerNames) => {
    startGame(playerNames)
    setScreen('playing')
  }

  const handleExit = () => {
    resetGame()
    setScreen('home')
  }

  const handleBackToHub = () => {
    resetGame()
    onBack()
  }

  const handlePlayAgain = () => {
    playAgain()
  }

  // Home screen
  if (screen === 'home') {
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
            <li>The Psychic gives a one-word clue to help the team</li>
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
            onClick={() => setScreen('setup')}
          >
            Start Game
          </button>
        </motion.div>
      </motion.div>
    )
  }

  // Setup screen
  if (screen === 'setup') {
    return (
      <Setup
        onStartGame={handleStartGame}
        onBack={() => setScreen('home')}
      />
    )
  }

  // Game screens based on phase
  if (screen === 'playing') {
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
            playerScore={playerScore}
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
            playerScore={playerScore}
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
            playerScore={playerScore}
            gameScore={gameScore}
            onContinue={finishReveal}
          />
        )}

        {phase === 'results' && (
          <ResultsScreen
            key="results"
            playerScore={playerScore}
            gameScore={gameScore}
            roundHistory={roundHistory}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        )}
      </AnimatePresence>
    )
  }

  // Fallback
  return (
    <div className="screen">
      <p>Loading...</p>
    </div>
  )
}
