import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Spectrum } from '../Spectrum'
import { calculateScore } from '../../hooks/useWavelengthRoom'

const zoneMessages = {
  bullseye: { title: 'BULLSEYE!', subtitle: 'Team +4 Points', emoji: '&#127919;' },
  close: { title: 'So Close!', subtitle: 'Team +3 Points', emoji: '&#128293;' },
  near: { title: 'Not Bad!', subtitle: 'Team +2 Points', emoji: '&#128076;' },
  miss: { title: 'Missed...', subtitle: 'Game scores!', emoji: '&#128532;' }
}

export function RevealView({
  spectrum,
  targetPosition,
  guessPosition,
  clue,
  psychicName,
  roundNumber,
  totalRounds,
  teamScore,
  gameScore,
  isHost,
  isLastRound,
  onNextPsychic
}) {
  const [showTarget, setShowTarget] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const result = calculateScore(targetPosition, guessPosition)
  const message = zoneMessages[result.zone]
  const distance = Math.abs(targetPosition - guessPosition)

  useEffect(() => {
    const targetTimer = setTimeout(() => setShowTarget(true), 500)
    const resultTimer = setTimeout(() => setShowResult(true), 1500)

    return () => {
      clearTimeout(targetTimer)
      clearTimeout(resultTimer)
    }
  }, [])

  return (
    <motion.div
      className="screen reveal-view-mp"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Score display - shows updated scores */}
      <div className="score-display">
        <div className="score-item you">
          <span className="score-label">Team</span>
          <motion.span
            className="score-value"
            key={teamScore + result.teamPoints}
            initial={{ scale: 1.5, color: '#4ade80' }}
            animate={{ scale: 1, color: '#06b6d4' }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            {teamScore + result.teamPoints}
          </motion.span>
        </div>
        <div className="score-divider">vs</div>
        <div className="score-item game">
          <span className="score-label">Game</span>
          <motion.span
            className="score-value"
            key={gameScore + result.gamePoints}
            initial={result.gamePoints > 0 ? { scale: 1.5, color: '#ef4444' } : {}}
            animate={{ scale: 1, color: '#f43f5e' }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            {gameScore + result.gamePoints}
          </motion.span>
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

      {/* Spectrum with reveal */}
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

      {/* Next button (host only) */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="button-group"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isHost ? (
              <button className="btn btn-primary" onClick={onNextPsychic}>
                {isLastRound ? 'See Final Results' : 'Continue'}
              </button>
            ) : (
              <p className="waiting-message">
                Waiting for host to continue...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
