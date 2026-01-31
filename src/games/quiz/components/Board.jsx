export function Board({
  room,
  categories,
  isPicker,
  sortedPlayers,
  onSelectQuestion,
  isHost,
  onEndGame
}) {
  // Get unique categories in order
  const categoryOrder = [...new Set(room.board.map(q => q.category))]
  
  // Group questions by category
  const questionsByCategory = categoryOrder.map(cat => ({
    category: cat,
    questions: room.board.filter(q => q.category === cat).sort((a, b) => a.value - b.value)
  }))

  // Find picker name
  const picker = room.players.find(p => p.id === room.picker_id)
  const pickerName = picker?.name || 'Someone'

  // Get medals for top 3
  const getMedal = (index) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return null
    }
  }

  return (
    <div className="quiz-game quiz-board">
      {/* Header */}
      <div className="quiz-board__header">
        <p className={`quiz-board__picker ${isPicker ? 'quiz-board__picker--you' : 'quiz-board__picker--other'}`}>
          {isPicker ? (
            <>Your turn to pick a question</>
          ) : (
            <><strong>{pickerName}</strong> is picking...</>
          )}
        </p>
      </div>

      {/* Board Grid */}
      <div className="quiz-board__grid">
        {/* Category headers */}
        <div className="quiz-board__row">
          {categoryOrder.map(cat => (
            <div key={cat} className="quiz-category">
              {cat}
            </div>
          ))}
        </div>

        {/* Question tiles - 5 rows for values 100-500 */}
        {[100, 200, 300, 400, 500].map(value => (
          <div key={value} className="quiz-board__row">
            {questionsByCategory.map(({ category, questions }) => {
              const question = questions.find(q => q.value === value)
              const questionIndex = question ? room.board.indexOf(question) : -1
              const isUsed = question?.used
              const isSelectable = isPicker && !isUsed && questionIndex >= 0

              return (
                <button
                  key={`${category}-${value}`}
                  className={`quiz-tile ${isUsed ? 'quiz-tile--used' : 'quiz-tile--available'} ${isSelectable ? 'quiz-tile--selectable' : ''}`}
                  onClick={() => isSelectable && onSelectQuestion(questionIndex)}
                  disabled={!isSelectable}
                >
                  {!isUsed && value}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Mini Scoreboard */}
      <div className="quiz-scoreboard-mini">
        {sortedPlayers.slice(0, 5).map((player, index) => (
          <div
            key={player.id}
            className={`quiz-mini-score ${index === 0 ? 'quiz-mini-score--leader' : ''}`}
          >
            {getMedal(index) && (
              <span className="quiz-mini-score__medal">{getMedal(index)}</span>
            )}
            <span className="quiz-mini-score__name">{player.name}</span>
            <span className="quiz-mini-score__score">{player.score}</span>
          </div>
        ))}
      </div>

      {/* End game button for host */}
      {isHost && (
        <div className="quiz-board__actions">
          <button
            className="quiz-btn quiz-btn--ghost"
            onClick={onEndGame}
          >
            End Game Early
          </button>
        </div>
      )}
    </div>
  )
}
