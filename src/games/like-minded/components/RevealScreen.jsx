import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Spectrum } from './Spectrum'

const zoneMessages = {
  bullseye: { title: 'BULLSEYE!', subtitle: '+4 Points', emoji: '&#127919;' },
  close: { title: 'So Close!', subtitle: '+3 Points', emoji: '&#128293;' },
  near: { title: 'Not Bad!', subtitle: '+2 Points', emoji: '&#128076;' },
  miss: { title: 'Missed...', subtitle: 'Game scores!', emoji: '&#128532;' }
}

export function RevealScreen({
  psychicName,
  spectrum,
  targetPosition,
  guessPosition,
  clue,
  result,
  roundNumber,
  totalRounds,
  playerScore,
  gameScore,
  onContinue
}) {
  const [showTarget, setShowTarget] = useState(false)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    // Animate reveal sequence
    const targetTimer = setTimeout(() => setShowTarget(true), 500)
    const resultTimer = setTimeout(() => setShowResult(true), 1500)

    return () => {
      clearTimeout(targetTimer)
      clearTimeout(resultTimer)
    }
  }, [])

  const message = zoneMessages[result.zone]
  const distance = Math.abs(targetPosition - guessPosition)

  return (
    <motion.div
      className="screen reveal-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Score display */}
      <div className="score-display">
        <div className="score-item you">
          <span className="score-label">You</span>
          <span className="score-value">{playerScore + result.playerPoints}</span>
        </div>
        <div className="score-divider">vs</div>
        <div className="score-item game">
          <span className="score-label">Game</span>
          <span className="score-value">{gameScore + result.gamePoints}</span>
        </div>
      </div>

      {/* Round indicator */}
      <div className="round-indicator">
        Round {roundNumber} of {totalRounds}
      </div>

      {/* Clue reminder */}
      <motion.div
        className="clue-reminder"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="clue-label">{psychicName}&apos;s clue:</span>
        <span className="clue-text">&ldquo;{clue}&rdquo;</span>
      </motion.div>

      {/* Spectrum with reveal animation */}
      <motion.div
        className="spectrum-section reveal"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Spectrum
          spectrum={spectrum}
          showTarget={showTarget}
          targetPosition={targetPosition}
          showGuess={true}
          guessPosition={guessPosition}
          showZones={showTarget}
        />
      </motion.div>

      {/* Distance indicator */}
      <AnimatePresence>
        {showTarget && (
          <motion.div
            className="distance-display"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <span className="distance-label">Distance:</span>
            <span className="distance-value">{distance}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result message */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className={`result-message ${result.zone}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <span
              className="result-emoji"
              dangerouslySetInnerHTML={{ __html: message.emoji }}
            />
            <span className="result-title">{message.title}</span>
            <span className="result-subtitle">{message.subtitle}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="button-group"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button className="btn btn-primary" onClick={onContinue}>
              {roundNumber < totalRounds ? 'Next Round' : 'See Results'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
