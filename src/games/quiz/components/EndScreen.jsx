export function EndScreen({ room, isHost, onPlayAgain, onLeave }) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]
  const podium = sorted.slice(0, 3)

  return (
    <div className="screen quiz-end">
      <h1>Game Over!</h1>

      <div className="winner-announcement">
        <span className="trophy">🏆</span>
        <h2>{winner.name} wins!</h2>
        <p className="winner-score">{winner.score} points</p>
      </div>

      <div className="podium">
        {podium.map((player, index) => (
          <div key={player.id} className={`podium-place place-${index + 1}`}>
            <div className="podium-rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
            </div>
            <div className="podium-name">{player.name}</div>
            <div className="podium-score">{player.score}</div>
          </div>
        ))}
      </div>

      <div className="final-scores">
        <h3>Final Standings</h3>
        <ul className="score-list">
          {sorted.map((player, index) => (
            <li key={player.id} className="score-item">
              <span className="rank">{index + 1}.</span>
              <span className="name">{player.name}</span>
              <span className="score">{player.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="end-actions">
        {isHost && (
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
        )}
        <button className="btn btn-secondary" onClick={onLeave}>
          Leave
        </button>
      </div>

      {!isHost && (
        <p className="hint">Waiting for host to start a new game...</p>
      )}
    </div>
  )
}
