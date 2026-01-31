export function EndScreen({
  room,
  sortedPlayers,
  isHost,
  onPlayAgain,
  onLeave
}) {
  // Get rank emoji
  const getRankEmoji = (index) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `${index + 1}.`
    }
  }

  // Get initials
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Calculate stats
  const getStats = (player) => {
    const accuracy = player.answerCount > 0
      ? Math.round((player.correctCount / player.answerCount) * 100)
      : 0
    const avgTime = player.answerCount > 0
      ? (player.totalTime / player.answerCount).toFixed(1)
      : '—'
    
    return { accuracy, avgTime }
  }

  return (
    <div className="quiz-game quiz-end">
      {/* Header */}
      <div className="quiz-end__header">
        <h1 className="quiz-end__title">Game Over</h1>
      </div>

      {/* Leaderboard */}
      <div className="quiz-leaderboard">
        <h3 className="quiz-leaderboard__title">Final Standings</h3>
        <ul className="quiz-leaderboard__list">
          {sortedPlayers.map((player, index) => {
            const { accuracy, avgTime } = getStats(player)
            const isTopThree = index < 3
            const isFirst = index === 0

            return (
              <li
                key={player.id}
                className={`quiz-leaderboard__item ${isTopThree ? 'quiz-leaderboard__item--top3' : ''} ${isFirst ? 'quiz-leaderboard__item--first' : ''}`}
              >
                <span className="quiz-leaderboard__rank">
                  {getRankEmoji(index)}
                </span>
                <div className="quiz-leaderboard__avatar">
                  {player.isBot ? '🤖' : getInitials(player.name)}
                </div>
                <div className="quiz-leaderboard__info">
                  <p className="quiz-leaderboard__name">{player.name}</p>
                  <p className="quiz-leaderboard__stats">
                    {accuracy}% accuracy · {avgTime}s avg
                  </p>
                </div>
                <span className="quiz-leaderboard__score">
                  {player.score.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="quiz-end__actions">
        {isHost && (
          <button
            className="quiz-btn quiz-btn--primary"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
        )}
        <button
          className="quiz-btn quiz-btn--secondary"
          onClick={onLeave}
        >
          Leave
        </button>
      </div>
    </div>
  )
}
