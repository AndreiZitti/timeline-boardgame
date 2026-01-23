import { useState } from 'react'

export function QuestionRound({
  room,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  onSubmitAnswer
}) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() && !hasAnswered) {
      onSubmitAnswer(answer.trim())
      setAnswer('')
    }
  }

  // Count how many have answered
  const answeredCount = room.players.filter(p => p.hasAnswered).length
  const totalPlayers = room.players.length

  // Timer color based on time remaining
  const timerClass = timeRemaining <= 10 ? 'critical' : timeRemaining <= 30 ? 'warning' : ''

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
        <form onSubmit={handleSubmit} className="answer-form">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            autoFocus
            maxLength={100}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!answer.trim()}
          >
            Submit
          </button>
        </form>
      ) : (
        <div className="answer-submitted">
          <p>Answer submitted! Waiting for others...</p>
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
