import { useState } from 'react'

export function WageringScreen({
  room,
  roundNumber,
  currentQuestion,
  availableBoxes,
  currentWager,
  wagerLocked,
  playerWagers,
  onSelectWager,
  onLockWager
}) {
  const category = currentQuestion?.category || room.current_question?.category

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

      {/* Other Players' Wagers */}
      <div className="quiz-wagering__players">
        <p className="quiz-wagering__label">Other players:</p>
        <div className="quiz-wagering__player-list">
          {playerWagers.map(p => (
            <div key={p.id} className="quiz-wagering__player">
              <span className="quiz-wagering__player-name">{p.name}</span>
              <span className={`quiz-wagering__player-wager ${p.locked ? 'quiz-wagering__player-wager--locked' : ''}`}>
                {p.locked ? `${p.wager} pts` : p.wager ? 'Choosing...' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
