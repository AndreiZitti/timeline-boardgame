import { getPackList } from '../data/packs'

export function Lobby({ 
  room, 
  isHost, 
  onSelectPack, 
  onStartGame, 
  onLeave, 
  error 
}) {
  const packs = getPackList()
  const selectedPack = packs.find(p => p.id === room.question_pack)

  return (
    <div className="screen quiz-lobby">
      <div className="lobby-header">
        <h2>Quiz Lobby</h2>
        <div className="room-code-display">
          <span className="label">Room Code:</span>
          <span className="code">{room.code}</span>
        </div>
      </div>

      <div className="lobby-content">
        <div className="players-section">
          <h3>Players ({room.players.length})</h3>
          <ul className="player-list">
            {room.players.map((player, index) => (
              <li key={player.id} className="player-item">
                <span className="player-name">{player.name}</span>
                {index === 0 && <span className="host-badge">Host</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="pack-section">
            <h3>Select Question Pack</h3>
            <div className="pack-list">
              {packs.map(pack => (
                <button
                  key={pack.id}
                  className={`pack-option ${room.question_pack === pack.id ? 'selected' : ''}`}
                  onClick={() => onSelectPack(pack.id)}
                >
                  <span className="pack-name">{pack.name}</span>
                  <span className="pack-info">
                    {pack.categoryCount} categories · {pack.questionCount} questions
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isHost && (
          <div className="waiting-section">
            <p>Waiting for host to select a question pack and start the game...</p>
            {selectedPack && (
              <p className="selected-pack">
                Selected: <strong>{selectedPack.name}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="lobby-actions">
        {isHost && (
          <button
            className="btn btn-primary"
            onClick={onStartGame}
            disabled={!room.question_pack || room.players.length < 2}
          >
            Start Game
          </button>
        )}
        <button className="btn btn-secondary" onClick={onLeave}>
          Leave Room
        </button>
      </div>

      {isHost && room.players.length < 2 && (
        <p className="hint">Need at least 2 players to start</p>
      )}
    </div>
  )
}
