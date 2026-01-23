export function Board({
  room,
  categories,
  isPicker,
  onSelectQuestion,
  isHost,
  onEndGame
}) {
  const values = [100, 200, 300, 400, 500]

  const getQuestion = (catIndex, valueIndex) => {
    const index = catIndex * 5 + valueIndex
    return room.board[index]
  }

  const pickerPlayer = room.players.find(p => p.id === room.picker_id)
  const pickerName = pickerPlayer?.name || 'Someone'

  // Sort players by score for mini scoreboard
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

  return (
    <div className="screen quiz-board quiz-game">
      <div className="board-header">
        <h2>Quiz</h2>
        <p className={`picker-status ${isPicker ? 'picker-status--you' : 'picker-status--other'}`}>
          {isPicker ? '✨ Your turn to pick!' : `${pickerName} is picking...`}
        </p>
      </div>

      <div className="scoreboard-mini">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`mini-score ${index === 0 ? 'mini-score--leader' : ''}`}
          >
            {index === 0 && <span className="mini-score__crown">👑</span>}
            <span className="mini-score__rank">{index + 1}.</span>
            <span className="mini-score__name">{player.name}</span>
            <span className="mini-score__score">{player.score}</span>
          </div>
        ))}
      </div>

      <div className="board-grid">
        {/* Category headers */}
        <div className="board-row board-row--categories">
          {categories.map((cat, i) => (
            <div key={i} className="category-header">
              {cat}
            </div>
          ))}
        </div>

        {/* Value rows */}
        {values.map((value, valueIndex) => (
          <div key={value} className="board-row">
            {categories.map((_, catIndex) => {
              const question = getQuestion(catIndex, valueIndex)
              const isUsed = question?.used

              return (
                <button
                  key={`${catIndex}-${valueIndex}`}
                  className={`board-tile ${isUsed ? 'board-tile--used' : ''} ${isPicker && !isUsed ? 'board-tile--selectable' : ''}`}
                  onClick={() => {
                    if (isPicker && !isUsed) {
                      onSelectQuestion(question.index)
                    }
                  }}
                  disabled={isUsed || !isPicker}
                >
                  <span className="board-tile__value">{value}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {isHost && (
        <div className="board-actions">
          <button className="btn btn-danger" onClick={onEndGame}>
            End Game
          </button>
        </div>
      )}
    </div>
  )
}
