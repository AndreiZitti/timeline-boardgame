import { useState } from 'react'

export function WageringScreen({
  room,
  roundNumber,
  currentQuestion,
  availableBoxes = [],
  currentWager,
  wagerLocked,
  playerWagers,
  onSelectWager,
  onLockWager,
  isHost,
  onEndGame
}) {
  const category = currentQuestion?.category || room.current_question?.category

  // Debug
  console.log('WageringScreen:', { availableBoxes, currentWager, wagerLocked })

  return (
    <div className="quiz-game quiz-wagering">
      {/* Header */}
      <div className="quiz-wagering__header">
        <span className="quiz-wagering__round">Round {roundNumber} of 10</span>
        <h2 className="quiz-wagering__category">{category}</h2>
        <p className="quiz-wagering__hint">How confident are you in this category?</p>
      </div>

      {/* Box Selection */}
      <div className="quiz-wagering__boxes">
        <p className="quiz-wagering__label">Select your wager:</p>
        <div className="quiz-wagering__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
            const isAvailable = availableBoxes.includes(num)
            const isSelected = currentWager === num

            return (
              <button
                key={num}
                className={`quiz-box ${isSelected ? 'quiz-box--selected' : ''} ${!isAvailable ? 'quiz-box--used' : ''}`}
                onClick={() => isAvailable && !wagerLocked && onSelectWager(num)}
                disabled={!isAvailable || wagerLocked}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lock Button */}
      <div className="quiz-wagering__actions">
        <button
          className="quiz-btn quiz-btn--primary quiz-btn--large"
          onClick={onLockWager}
          disabled={currentWager === null || wagerLocked}
        >
          {wagerLocked ? 'Locked In!' : 'Lock In Wager'}
        </button>
      </div>

      {/* Other Players' Status */}
      <div className="quiz-wagering__players">
        <p className="quiz-wagering__label">Players:</p>
        <div className="quiz-wagering__player-list">
          {playerWagers
            .sort((a, b) => b.score - a.score)
            .map(p => (
              <div key={p.id} className="quiz-wagering__player">
                <span className="quiz-wagering__player-name">{p.name}</span>
                <span className="quiz-wagering__player-score">{p.score} pts</span>
                <span className={`quiz-wagering__player-wager ${p.locked ? 'quiz-wagering__player-wager--locked' : ''}`}>
                  {p.locked ? `Wagered ${p.wager}` : p.wager ? 'Choosing...' : '—'}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Host: End Game Early */}
      {isHost && (
        <button
          className="quiz-btn quiz-btn--ghost quiz-end-early"
          onClick={onEndGame}
        >
          End Game Early
        </button>
      )}
    </div>
  )
}
