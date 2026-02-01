import { useState, useRef, useEffect } from 'react'

export function QuestionRound({
  room,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  onSubmitAnswer,
  isHost,
  onEndGame
}) {
  const [answer, setAnswer] = useState('')
  const [submittedAnswer, setSubmittedAnswer] = useState(null)
  const inputRef = useRef(null)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !hasAnswered) {
      inputRef.current.focus()
    }
  }, [hasAnswered])

  // Reset state when question changes
  useEffect(() => {
    setAnswer('')
    setSubmittedAnswer(null)
  }, [currentQuestion?.id])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (hasAnswered || !answer.trim()) return
    setSubmittedAnswer(answer.trim())
    onSubmitAnswer(answer.trim())
  }

  // Count answered players
  const answeredCount = room.players.filter(p => p.hasAnswered).length
  const totalPlayers = room.players.length
  const progressPercent = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0

  // Get submission times for players
  const submissions = room.current_question?.submissions || []
  const startTime = room.current_question?.started_at
    ? new Date(room.current_question.started_at).getTime()
    : null

  const getPlayerTime = (playerId) => {
    if (!startTime) return null
    const submission = submissions.find(s => s.player_id === playerId)
    if (!submission?.submitted_at) return null
    const submitTime = new Date(submission.submitted_at).getTime()
    return ((submitTime - startTime) / 1000).toFixed(1)
  }

  // Timer state
  const timerClass = timeRemaining <= 10
    ? 'quiz-timer--critical'
    : timeRemaining <= 30
      ? 'quiz-timer--warning'
      : ''

  // Check if it's an open-ended question
  const isOpenEnded = currentQuestion.type === 'open'

  // For multiple choice (legacy support)
  const letters = ['A', 'B', 'C', 'D']
  const isBoolean = currentQuestion.type === 'boolean'
  const options = currentQuestion.options && currentQuestion.options.length > 0
    ? currentQuestion.options
    : isBoolean
      ? ['True', 'False']
      : []

  const handleOptionSelect = (option) => {
    if (hasAnswered) return
    setSubmittedAnswer(option)
    onSubmitAnswer(option)
  }

  return (
    <div className="quiz-game quiz-question">
      {/* Header */}
      <div className="quiz-question__header">
        <div className="quiz-question__meta">
          <span className="quiz-question__category">{currentQuestion.category}</span>
          <span className="quiz-question__difficulty">{currentQuestion.difficulty}</span>
        </div>
        <div className={`quiz-timer ${timerClass}`}>
          <span className="quiz-timer__icon">⏱️</span>
          <span className="quiz-timer__time">{timeRemaining}s</span>
        </div>
      </div>

      {/* Question */}
      <div className="quiz-question__content">
        <p className="quiz-question__text">{currentQuestion.question}</p>
      </div>

      {/* Answer Input */}
      {!hasAnswered ? (
        isOpenEnded ? (
          <form className="quiz-answer-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="quiz-answer-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button
              type="submit"
              className="quiz-btn quiz-btn--primary quiz-btn--large"
              disabled={!answer.trim()}
            >
              Submit Answer
            </button>
          </form>
        ) : (
          <div className={`quiz-options ${isBoolean ? 'quiz-options--boolean' : ''}`}>
            {options.map((option, index) => (
              <button
                key={index}
                className={`quiz-option ${submittedAnswer === option ? 'quiz-option--selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={hasAnswered}
              >
                {!isBoolean && (
                  <span className="quiz-option__letter">{letters[index]}</span>
                )}
                <span className="quiz-option__text">{option}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="quiz-submitted">
          <p className="quiz-submitted__title">Answer submitted!</p>
          <p className="quiz-submitted__waiting">Waiting for other players...</p>
        </div>
      )}

      {/* Progress */}
      <div className="quiz-progress">
        <p className="quiz-progress__text">
          {answeredCount} of {totalPlayers} answered
        </p>
        <div className="quiz-progress__bar">
          <div
            className="quiz-progress__fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="quiz-progress__indicators">
          {room.players.map(player => {
            const time = getPlayerTime(player.id)
            return (
              <div
                key={player.id}
                className={`quiz-progress__indicator ${player.hasAnswered ? 'quiz-progress__indicator--answered' : ''}`}
                title={player.name}
              >
                <span className="quiz-progress__indicator-name">{player.name.charAt(0).toUpperCase()}</span>
                {player.hasAnswered && time && (
                  <span className="quiz-progress__indicator-time">{time}s</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Host: End Game Early */}
      {isHost && (
        <button
          className="quiz-btn quiz-btn--ghost quiz-end-early"
          onClick={onEndGame}
        >
          End Game Early
        </button>
      )}
    </div>
  )
}
