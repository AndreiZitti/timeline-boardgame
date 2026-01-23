import './Timer.css'

export function Timer({
  seconds,
  maxSeconds = 60,
  size = 'medium',
  warningAt = 30,
  criticalAt = 10
}) {
  // Calculate ring progress
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = seconds / maxSeconds
  const offset = circumference * (1 - progress)

  // Determine state
  const isCritical = seconds <= criticalAt
  const isWarning = seconds <= warningAt && !isCritical

  const ringClass = [
    'quiz-timer__ring',
    isWarning && 'quiz-timer__ring--warning',
    isCritical && 'quiz-timer__ring--critical'
  ].filter(Boolean).join(' ')

  const containerClass = [
    'quiz-timer',
    `quiz-timer--${size}`,
    isCritical && 'quiz-timer--critical'
  ].filter(Boolean).join(' ')

  return (
    <div className={containerClass}>
      <svg viewBox="0 0 80 80">
        <circle
          className="quiz-timer__bg"
          cx="40"
          cy="40"
          r={radius}
        />
        <circle
          className={ringClass}
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="quiz-timer__text">{seconds}</span>
    </div>
  )
}
