import { useState } from 'react'

export function QuestionRound({
  room,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  onSubmitAnswer
}) {
  const [textAnswer, setTextAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)

  const handleTextSubmit = (e) => {
    e.preventDefault()
    if (textAnswer.trim() && !hasAnswered) {
      onSubmitAnswer(textAnswer.trim())
      setTextAnswer('')
    }
  }

  const handleOptionSelect = (option) => {
    if (hasAnswered) return
    setSelectedOption(option)
    onSubmitAnswer(option)
  }

  // Count how many have answered
  const answeredCount = room.players.filter(p => p.hasAnswered).length
  const totalPlayers = room.players.length

  // Timer color based on time remaining
  const timerClass = timeRemaining <= 10 ? 'critical' : timeRemaining <= 30 ? 'warning' : ''

  // Determine question type
  const questionType = currentQuestion.type || 'text'
  const isMultipleChoice = questionType === 'multiple' || questionType === 'boolean'

  return (
    <div className="screen quiz-question">
      <div className="question-header">
        <div className="question-meta">
          <span className="category">{currentQuestion.category}</span>
          <span className="value">{currentQuestion.value} points</span>
        </div>
        <div className={`timer ${timerClass}`}>
          {timeRemaining}s
        </div>
      </div>

      <div className="question-content">
        <p className="question-text">{currentQuestion.question}</p>
      </div>

      {!hasAnswered ? (
        isMultipleChoice ? (
          // Multiple choice or True/False
          <div className={`options-grid ${questionType === 'boolean' ? 'boolean' : ''}`}>
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${selectedOption === option ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={hasAnswered}
              >
                <span className="option-letter">
                  {questionType === 'boolean' ? '' : String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        ) : (
          // Free text input
          <form onSubmit={handleTextSubmit} className="answer-form">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer..."
              autoFocus
              maxLength={100}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!textAnswer.trim()}
            >
              Submit
            </button>
          </form>
        )
      ) : (
        <div className="answer-submitted">
          <p>Answer submitted! Waiting for others...</p>
          {selectedOption && (
            <p className="your-answer">Your answer: <strong>{selectedOption}</strong></p>
          )}
        </div>
      )}

      <div className="answer-status">
        <p>{answeredCount} of {totalPlayers} players have answered</p>
        <div className="answer-indicators">
          {room.players.map(player => (
            <div 
              key={player.id} 
              className={`indicator ${player.hasAnswered ? 'answered' : ''}`}
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
