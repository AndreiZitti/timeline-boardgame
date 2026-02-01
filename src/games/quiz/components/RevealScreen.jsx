import { useEffect, useRef, useState } from 'react'
import { likeQuestion, dislikeQuestion } from '../data/questions-db'

export function RevealScreen({
  room,
  currentQuestion,
  isHost,
  onContinue
}) {
  const hasCalledContinue = useRef(false)
  const [voted, setVoted] = useState(null) // 'like' | 'dislike' | null

  const handleLike = () => {
    if (voted) return
    setVoted('like')
    likeQuestion(currentQuestion.id)
  }

  const handleDislike = () => {
    if (voted) return
    setVoted('dislike')
    dislikeQuestion(currentQuestion.id)
  }

  // Auto-continue after 3 seconds
  useEffect(() => {
    if (hasCalledContinue.current) return

    const timer = setTimeout(() => {
      if (!hasCalledContinue.current) {
        hasCalledContinue.current = true
        onContinue()
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [onContinue])

  // Reset ref and vote state when question changes
  useEffect(() => {
    hasCalledContinue.current = false
    setVoted(null)
  }, [currentQuestion?.index])

  const submissions = room.current_question?.submissions || []
  const pointsAwarded = room.current_question?.points_awarded || []

  // Sort submissions: correct first (by points descending), then incorrect
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.correct && !b.correct) return -1
    if (!a.correct && b.correct) return 1
    
    const aPoints = pointsAwarded.find(p => p.player_id === a.player_id)?.points || 0
    const bPoints = pointsAwarded.find(p => p.player_id === b.player_id)?.points || 0
    return bPoints - aPoints
  })

  // Get player name
  const getPlayerName = (playerId) => {
    return room.players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '—'
    return `${seconds.toFixed(1)}s`
  }

  return (
    <div className="quiz-game quiz-reveal">
      {/* Header with correct answer */}
      <div className="quiz-reveal__header">
        <p className="quiz-reveal__answer">
          <span>✓</span> {currentQuestion.answer}
        </p>
        <div className="quiz-reveal__vote">
          <button
            className={`quiz-vote-btn quiz-vote-btn--like ${voted === 'like' ? 'quiz-vote-btn--active' : ''}`}
            onClick={handleLike}
            disabled={voted !== null}
            aria-label="Like this question"
          >
            👍
          </button>
          <button
            className={`quiz-vote-btn quiz-vote-btn--dislike ${voted === 'dislike' ? 'quiz-vote-btn--active' : ''}`}
            onClick={handleDislike}
            disabled={voted !== null}
            aria-label="Dislike this question"
          >
            👎
          </button>
        </div>
      </div>

      {/* Question (dimmed) */}
      <div className="quiz-reveal__question">
        {currentQuestion.question}
      </div>

      {/* Results */}
      <div className="quiz-results">
        <h3 className="quiz-results__title">Results</h3>
        {sortedSubmissions.length === 0 ? (
          <p className="quiz-results__empty" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            No one answered this question
          </p>
        ) : (
          <ul className="quiz-results__list">
            {sortedSubmissions.map((sub, index) => {
              const points = pointsAwarded.find(p => p.player_id === sub.player_id)?.points || 0
              const animDelay = index * 0.1

              return (
                <li
                  key={sub.player_id}
                  className={`quiz-result ${sub.correct ? 'quiz-result--correct' : 'quiz-result--incorrect'}`}
                  style={{ animationDelay: `${animDelay}s` }}
                >
                  <span className="quiz-result__icon">
                    {sub.correct ? '✓' : '✗'}
                  </span>
                  <div className="quiz-result__info">
                    <span className="quiz-result__name">
                      {getPlayerName(sub.player_id)}
                    </span>
                    <span className="quiz-result__answer">
                      "{sub.answer}"
                    </span>
                  </div>
                  <span className="quiz-result__time">
                    {formatTime(sub.responseTime)}
                  </span>
                  <span className={`quiz-result__points ${sub.correct ? 'quiz-result__points--correct' : 'quiz-result__points--incorrect'}`}>
                    {sub.correct ? `+${points}` : '0'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Auto-continue indicator */}
      <div className="quiz-reveal__continue">
        <p className="quiz-reveal__continue-text">
          Continuing automatically...
        </p>
      </div>
    </div>
  )
}
