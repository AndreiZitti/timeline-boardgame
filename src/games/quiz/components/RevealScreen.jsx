export function RevealScreen({
  room,
  currentQuestion,
  onContinue
}) {
  const submissions = room.current_question?.submissions || []
  const pointsAwarded = room.current_question?.points_awarded || []

  // Sort submissions by time
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)
  )

  // Get player name by ID
  const getPlayerName = (playerId) => {
    return room.players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  // Get points for player
  const getPoints = (playerId) => {
    const awarded = pointsAwarded.find(p => p.player_id === playerId)
    return awarded?.points || 0
  }

  return (
    <div className="screen quiz-reveal">
      <div className="reveal-header">
        <div className="question-meta">
          <span className="category">{currentQuestion.category}</span>
          <span className="value">{currentQuestion.value} points</span>
        </div>
      </div>

      <div className="reveal-question">
        <p className="question-text">{currentQuestion.question}</p>
      </div>

      <div className="correct-answer">
        <span className="label">Correct Answer:</span>
        <span className="answer">{currentQuestion.answer}</span>
      </div>

      <div className="submissions-list">
        <h3>Submissions</h3>
        {sortedSubmissions.length === 0 ? (
          <p className="no-submissions">No one answered in time!</p>
        ) : (
          <ul>
            {sortedSubmissions.map((submission, index) => {
              const points = getPoints(submission.player_id)
              return (
                <li 
                  key={submission.player_id}
                  className={`submission ${submission.correct ? 'correct' : 'incorrect'}`}
                >
                  <span className="rank">{index + 1}.</span>
                  <span className="player-name">{getPlayerName(submission.player_id)}</span>
                  <span className="player-answer">"{submission.answer}"</span>
                  <span className={`result ${submission.correct ? 'correct' : 'incorrect'}`}>
                    {submission.correct ? `+${points}` : '✗'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="reveal-scores">
        <h3>Scores</h3>
        <ul className="score-list">
          {room.players
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <li key={player.id} className="score-item">
                <span className="rank">{index + 1}.</span>
                <span className="name">{player.name}</span>
                <span className="score">{player.score}</span>
              </li>
            ))}
        </ul>
      </div>

      <button className="btn btn-primary" onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}
