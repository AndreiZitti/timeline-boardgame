import { useState } from 'react'
import { motion } from 'framer-motion'
import { Spectrum } from './Spectrum'

export function PsychicScreen({
  psychicName,
  spectrum,
  targetPosition,
  roundNumber,
  totalRounds,
  teamScore,
  gameScore,
  onSubmitClue
}) {
  const [clue, setClue] = useState('')
  const [revealTriggered, setRevealTriggered] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)

  const handleReveal = () => {
    setRevealTriggered(true)
  }

  const handleAnimationComplete = () => {
    setAnimationComplete(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (clue.trim()) {
      onSubmitClue(clue.trim())
    }
  }

  return (
    <motion.div
      className="screen psychic-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Score display */}
      <div className="score-display">
        <div className="score-item you">
          <span className="score-label">Team</span>
          <span className="score-value">{teamScore}</span>
        </div>
        <div className="score-divider">vs</div>
        <div className="score-item game">
          <span className="score-label">Game</span>
          <span className="score-value">{gameScore}</span>
        </div>
      </div>

      {/* Round indicator */}
      <div className="round-indicator">
        Round {roundNumber} of {totalRounds}
      </div>

      {/* Psychic badge */}
      <motion.div
        className="psychic-badge"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <span className="psychic-icon">&#129504;</span>
        <span className="psychic-name">{psychicName}</span>
        <span className="psychic-role">is the Psychic!</span>
      </motion.div>

      {/* Spectrum with target - spin animation */}
      <motion.div
        className="spectrum-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Spectrum
          spectrum={spectrum}
          showTarget={revealTriggered}
          targetPosition={targetPosition}
          animateReveal={true}
          onAnimationComplete={handleAnimationComplete}
        />
      </motion.div>

      {/* Reveal button - shown before reveal is triggered */}
      {!revealTriggered && (
        <motion.div
          className="reveal-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p>When you&apos;re ready, reveal your target position!</p>
          <button className="btn btn-primary btn-reveal" onClick={handleReveal}>
            Reveal Target
          </button>
        </motion.div>
      )}

      {/* Instructions - shown after animation completes */}
      {animationComplete && (
        <motion.div
          className="psychic-instructions"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p>The target is at <strong>{targetPosition}</strong></p>
          <p>Give a clue to help your team find it!</p>
        </motion.div>
      )}

      {/* Clue input - shown after animation completes */}
      {animationComplete && (
        <motion.form
          className="clue-form"
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="input-group">
            <label>Your Clue</label>
            <input
              type="text"
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              placeholder="Enter a word or phrase..."
              maxLength={50}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!clue.trim()}
          >
            Submit Clue
          </button>
        </motion.form>
      )}

      {/* Tip - shown after animation completes */}
      {animationComplete && (
        <div className="psychic-tip">
          Tip: Don&apos;t use numbers! Think about what fits the spectrum position.
        </div>
      )}
    </motion.div>
  )
}
