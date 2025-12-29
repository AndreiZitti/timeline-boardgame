import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import GaugeComponent from 'react-gauge-component'

export function Spectrum({
  spectrum,
  showTarget = false,
  targetPosition = 0,
  showGuess = false,
  guessPosition = 50,
  onGuessChange,
  interactive = false,
  showZones = false,
  animateReveal = false,
  onAnimationComplete
}) {
  const [displayValue, setDisplayValue] = useState(50)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinComplete, setSpinComplete] = useState(false)
  const animationRef = useRef(null)

  // Oscillating spin animation: 0 → 100 → 0 → 100 → ... → target
  useEffect(() => {
    if (animateReveal && showTarget && !spinComplete) {
      setIsSpinning(true)
      setSpinComplete(false)
      setDisplayValue(0)

      const oscillations = 3 // Number of full 0→100→0 cycles
      const oscillationDuration = 600 // ms per half-oscillation (0→100 or 100→0)
      const settlingDuration = 800 // ms to settle on final target

      let startTime = null
      let currentPhase = 0 // 0 = oscillating, 1 = settling

      const totalOscillationTime = oscillations * 2 * oscillationDuration

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime

        if (elapsed < totalOscillationTime) {
          // Oscillation phase
          const oscillationProgress = elapsed / oscillationDuration
          const cyclePosition = oscillationProgress % 2 // 0-2 represents one full cycle

          let value
          if (cyclePosition < 1) {
            // Going from 0 to 100
            value = cyclePosition * 100
          } else {
            // Going from 100 to 0
            value = (2 - cyclePosition) * 100
          }

          setDisplayValue(Math.round(value))
          animationRef.current = requestAnimationFrame(animate)
        } else if (elapsed < totalOscillationTime + settlingDuration) {
          // Settling phase - ease towards target
          const settlingProgress = (elapsed - totalOscillationTime) / settlingDuration
          // Use easeOutBack for a nice overshoot effect
          const eased = 1 - Math.pow(1 - settlingProgress, 3)

          // Start from wherever we ended (should be near 0 or 100)
          const startValue = oscillations % 2 === 0 ? 0 : 100
          const value = startValue + (targetPosition - startValue) * eased

          setDisplayValue(Math.round(value))
          animationRef.current = requestAnimationFrame(animate)
        } else {
          // Animation complete
          setDisplayValue(targetPosition)
          setIsSpinning(false)
          setSpinComplete(true)
          onAnimationComplete?.()
        }
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    } else if (showTarget && !animateReveal) {
      setDisplayValue(targetPosition)
    }
  }, [animateReveal, showTarget, targetPosition, spinComplete])

  // Reset spin state when target changes
  useEffect(() => {
    setSpinComplete(false)
  }, [targetPosition])

  // Update display value for guess mode
  useEffect(() => {
    if (showGuess && !showTarget) {
      setDisplayValue(guessPosition)
    }
  }, [guessPosition, showGuess, showTarget])

  // Handle gauge click for interactive mode
  const handleGaugeClick = useCallback((e) => {
    if (!interactive || !onGuessChange) return

    const gauge = e.currentTarget
    const rect = gauge.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.bottom

    const clickX = e.clientX - centerX
    const clickY = centerY - e.clientY

    let angle = Math.atan2(clickY, clickX) * (180 / Math.PI)
    const value = Math.round(((180 - angle) / 180) * 100)
    const clamped = Math.max(0, Math.min(100, value))

    onGuessChange(clamped)
  }, [interactive, onGuessChange])

  // Monochromatic purple arc segments
  const getSubArcs = () => {
    if (!showZones) {
      // Monochromatic purple gradient - light to dark
      return [
        { limit: 20, color: '#c4b5fd', showTick: false },  // Lightest purple
        { limit: 40, color: '#a78bfa', showTick: false },
        { limit: 60, color: '#8b5cf6', showTick: false },  // Mid purple
        { limit: 80, color: '#7c3aed', showTick: false },
        { limit: 100, color: '#6d28d9', showTick: false }  // Darkest purple
      ]
    }

    // Zone-based coloring (still monochromatic-ish with zone highlights)
    const zones = []
    const bullseyeStart = Math.max(0, targetPosition - 5)
    const bullseyeEnd = Math.min(100, targetPosition + 5)
    const closeStart = Math.max(0, targetPosition - 12)
    const closeEnd = Math.min(100, targetPosition + 12)
    const nearStart = Math.max(0, targetPosition - 20)
    const nearEnd = Math.min(100, targetPosition + 20)

    // Build zones from left to right
    if (nearStart > 0) {
      zones.push({ limit: nearStart, color: '#4c1d95', showTick: false }) // Dark purple background
    }
    if (closeStart > nearStart) {
      zones.push({ limit: closeStart, color: '#7c3aed55', showTick: false }) // Near zone - translucent
    }
    if (bullseyeStart > closeStart) {
      zones.push({ limit: bullseyeStart, color: '#a78bfa77', showTick: false }) // Close zone
    }
    zones.push({ limit: bullseyeEnd, color: '#c4b5fd', showTick: false }) // Bullseye - brightest
    if (closeEnd > bullseyeEnd) {
      zones.push({ limit: closeEnd, color: '#a78bfa77', showTick: false }) // Close zone
    }
    if (nearEnd > closeEnd) {
      zones.push({ limit: nearEnd, color: '#7c3aed55', showTick: false }) // Near zone
    }
    if (nearEnd < 100) {
      zones.push({ limit: 100, color: '#4c1d95', showTick: false }) // Dark purple background
    }

    return zones
  }

  return (
    <motion.div
      className="spectrum-gauge-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Labels */}
      <div className="gauge-labels">
        <motion.span
          className="gauge-label left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {spectrum.left}
        </motion.span>
        <motion.span
          className="gauge-label right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {spectrum.right}
        </motion.span>
      </div>

      {/* Gauge */}
      <div
        className={`gauge-wrapper ${interactive ? 'interactive' : ''} ${isSpinning ? 'spinning' : ''}`}
        onClick={interactive ? handleGaugeClick : undefined}
      >
        <GaugeComponent
          type="semicircle"
          arc={{
            subArcs: getSubArcs(),
            padding: 0.02,
            width: 0.25,
            cornerRadius: 4
          }}
          pointer={{
            type: 'needle',
            color: '#e9d5ff', // Light purple needle
            length: 0.75,
            width: 20,
            elastic: !isSpinning,
            animationDuration: isSpinning ? 50 : 1200,
            animationDelay: 0
          }}
          value={displayValue}
          minValue={0}
          maxValue={100}
          labels={{
            valueLabel: {
              hide: true
            },
            tickLabels: {
              hideMinMax: true,
              ticks: []
            }
          }}
        />

        {/* Center decoration */}
        <div className="gauge-center">
          <AnimatePresence mode="wait">
            {isSpinning ? (
              <motion.div
                key="spinning"
                className="gauge-center-content spinning"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <span className="gauge-value spinning-value">{Math.round(displayValue)}</span>
              </motion.div>
            ) : (
              <motion.div
                key="value"
                className="gauge-center-content"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span className="gauge-value">{Math.round(displayValue)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Guess slider for interactive mode */}
      {interactive && (
        <motion.div
          className="gauge-slider-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={guessPosition}
            onChange={(e) => onGuessChange?.(parseInt(e.target.value, 10))}
            className="gauge-slider"
          />
          <div className="gauge-slider-labels">
            <span>0</span>
            <span className="gauge-slider-value">{guessPosition}</span>
            <span>100</span>
          </div>
        </motion.div>
      )}

      {/* Status indicator */}
      <AnimatePresence>
        {showTarget && spinComplete && (
          <motion.div
            className="gauge-status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="status-text">Target: {targetPosition}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
