import { motion } from 'framer-motion'
import { Spectrum } from './Spectrum'

export function GuessScreen({
  psychicName,
  spectrum,
  clue,
  guessPosition,
  roundNumber,
  totalRounds,
  teamScore,
  gameScore,
  onUpdateGuess,
  onLockIn
}) {
  return (
    <motion.div
      className="screen guess-screen"
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

      {/* Clue display */}
      <motion.div
        className="clue-display"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <span className="clue-label">{psychicName}&apos;s clue:</span>
        <span className="clue-text">&ldquo;{clue}&rdquo;</span>
      </motion.div>

      {/* Spectrum with guess slider */}
      <motion.div
        className="spectrum-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Spectrum
          spectrum={spectrum}
          showGuess={true}
          guessPosition={guessPosition}
          onGuessChange={onUpdateGuess}
          interactive={true}
        />
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="guess-instructions"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p>Where on the spectrum does the clue point?</p>
        <p className="guess-tip">Drag the slider to make your guess!</p>
      </motion.div>

      {/* Lock in button */}
      <motion.div
        className="button-group"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button className="btn btn-primary btn-lock" onClick={onLockIn}>
          Lock In Guess
        </button>
      </motion.div>
    </motion.div>
  )
}
