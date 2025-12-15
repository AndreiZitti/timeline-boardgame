import { motion } from 'framer-motion'

export function Spectrum({
  spectrum,
  showTarget = false,
  targetPosition = 0,
  showGuess = false,
  guessPosition = 50,
  onGuessChange,
  interactive = false,
  showZones = false
}) {
  const handleSliderChange = (e) => {
    if (onGuessChange) {
      onGuessChange(parseInt(e.target.value, 10))
    }
  }

  const handleTrackClick = (e) => {
    if (!interactive || !onGuessChange) return

    const track = e.currentTarget
    const rect = track.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.round((x / rect.width) * 100)
    const clamped = Math.max(0, Math.min(100, percentage))
    onGuessChange(clamped)
  }

  return (
    <div className="spectrum-container">
      {/* Labels */}
      <div className="spectrum-labels">
        <span className="spectrum-label left">{spectrum.left}</span>
        <span className="spectrum-label right">{spectrum.right}</span>
      </div>

      {/* Track */}
      <div
        className={`spectrum-track ${interactive ? 'interactive' : ''}`}
        onClick={handleTrackClick}
      >
        {/* Gradient background */}
        <div className="spectrum-gradient" />

        {/* Scoring zones (shown during reveal) */}
        {showZones && (
          <div className="spectrum-zones" style={{ '--target': `${targetPosition}%` }}>
            <div className="zone bullseye" style={{ left: `${Math.max(0, targetPosition - 5)}%`, width: `${Math.min(10, Math.min(targetPosition, 100 - targetPosition) + 5)}%` }} />
            <div className="zone close" style={{ left: `${Math.max(0, targetPosition - 12)}%`, width: `${Math.min(24, targetPosition + 12, 112 - targetPosition)}%` }} />
            <div className="zone near" style={{ left: `${Math.max(0, targetPosition - 20)}%`, width: `${Math.min(40, targetPosition + 20, 120 - targetPosition)}%` }} />
          </div>
        )}

        {/* Target marker */}
        {showTarget && (
          <motion.div
            className="spectrum-target"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{ left: `${targetPosition}%` }}
          >
            <div className="target-marker" />
            <div className="target-glow" />
          </motion.div>
        )}

        {/* Guess marker */}
        {showGuess && (
          <motion.div
            className="spectrum-guess"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ left: `${guessPosition}%` }}
          >
            <div className="guess-marker" />
          </motion.div>
        )}

        {/* Interactive slider (hidden but functional) */}
        {interactive && (
          <input
            type="range"
            min="0"
            max="100"
            value={guessPosition}
            onChange={handleSliderChange}
            className="spectrum-slider"
          />
        )}
      </div>

      {/* Position indicator */}
      {interactive && (
        <div className="spectrum-position">
          <span className="position-value">{guessPosition}</span>
        </div>
      )}
    </div>
  )
}
