import { useState, useEffect } from 'react'

export function QuestionRound({
  room,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  onSubmitAnswer
}) {
  const [selectedOption, setSelectedOption] = useState(null)

  // Debug: log question data
  useEffect(() => {
    console.log('Current question:', currentQuestion)
  }, [currentQuestion])

  const handleOptionSelect = (option) => {
    if (hasAnswered) return
    setSelectedOption(option)
    onSubmitAnswer(option)
  }

  // Count answered players
  const answeredCount = room.players.filter(p => p.hasAnswered).length
  const totalPlayers = room.players.length
  const progressPercent = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0

  // Timer state
  const timerClass = timeRemaining <= 10 
    ? 'quiz-timer--critical' 
    : timeRemaining <= 30 
      ? 'quiz-timer--warning' 
      : ''

  // Option letters
  const letters = ['A', 'B', 'C', 'D']

  const isBoolean = currentQuestion.type === 'boolean'
  
  // Get options - ensure it's an array with at least the answer
  const options = currentQuestion.options && currentQuestion.options.length > 0
    ? currentQuestion.options
    : isBoolean 
      ? ['True', 'False']
      : [currentQuestion.answer, 'Option B', 'Option C', 'Option D']

  return (
    <div className="quiz-game quiz-question">
      {/* Header */}
      <div className="quiz-question__header">
        <div className="quiz-question__meta">
          <span className="quiz-question__category">{currentQuestion.category}</span>
          <span className="quiz-question__value">{currentQuestion.value} pts</span>
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

      {/* Options */}
      {!hasAnswered ? (
        <div className={`quiz-options ${isBoolean ? 'quiz-options--boolean' : ''}`}>
          {options.map((option, index) => (
            <button
              key={index}
              className={`quiz-option ${selectedOption === option ? 'quiz-option--selected' : ''}`}
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
      ) : (
        <div className="quiz-submitted">
          <p className="quiz-submitted__title">✓ Answer submitted!</p>
          {selectedOption && (
            <p className="quiz-submitted__answer">
              Your answer: <strong>{selectedOption}</strong>
            </p>
          )}
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
          {room.players.map(player => (
            <div
              key={player.id}
              className={`quiz-progress__indicator ${player.hasAnswered ? 'quiz-progress__indicator--answered' : ''}`}
              title={player.name}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
