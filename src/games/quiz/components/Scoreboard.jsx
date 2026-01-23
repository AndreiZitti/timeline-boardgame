export function Scoreboard({ players, currentPlayerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="scoreboard">
      <h3>Scoreboard</h3>
      <ul className="score-list">
        {sorted.map((player, index) => (
          <li 
            key={player.id} 
            className={`score-item ${player.id === currentPlayerId ? 'current' : ''}`}
          >
            <span className="rank">{index + 1}.</span>
            <span className="name">{player.name}</span>
            <span className="score">{player.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
