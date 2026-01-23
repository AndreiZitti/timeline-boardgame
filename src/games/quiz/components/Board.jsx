export function Board({ 
  room, 
  categories, 
  isPicker, 
  onSelectQuestion,
  isHost,
  onEndGame 
}) {
  const values = [100, 200, 300, 400, 500]

  // Get question by category index and value index
  const getQuestion = (catIndex, valueIndex) => {
    const index = catIndex * 5 + valueIndex
    return room.board[index]
  }

  const pickerName = room.players.find(p => p.id === room.picker_id)?.name || 'Someone'

  return (
    <div className="screen quiz-board">
      <div className="board-header">
        <h2>Quiz Board</h2>
        {isPicker ? (
          <p className="picker-status">Your turn to pick a question!</p>
        ) : (
          <p className="picker-status">{pickerName} is picking...</p>
        )}
      </div>

      <div className="scoreboard-mini">
        {room.players
          .slice()
          .sort((a, b) => b.score - a.score)
          .map((player, index) => (
            <div key={player.id} className="mini-score">
              <span className="rank">{index + 1}.</span>
              <span className="name">{player.name}</span>
              <span className="score">{player.score}</span>
            </div>
          ))}
      </div>

      <div className="board-grid">
        {/* Category headers */}
        <div className="board-row categories">
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
                  className={`board-tile ${isUsed ? 'used' : ''} ${isPicker && !isUsed ? 'selectable' : ''}`}
                  onClick={() => {
                    if (isPicker && !isUsed) {
                      onSelectQuestion(question.index)
                    }
                  }}
                  disabled={isUsed || !isPicker}
                >
                  {isUsed ? '' : value}
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
