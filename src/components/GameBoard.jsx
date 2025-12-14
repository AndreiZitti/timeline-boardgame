import { useState } from 'react'

export function GameBoard({
  players,
  currentPlayer,
  playerId,
  category,
  phase,
  isHost,
  onUpdateSlot,
  onToggleHidden,
  onReveal,
  onNextRound,
  onLeave
}) {
  const [draggingCard, setDraggingCard] = useState(null)
  const numSlots = players.length

  // Get player in a specific slot
  const getPlayerInSlot = (slotIndex) => {
    return players.find(p => p.slot === slotIndex)
  }

  // Handle drag start
  const handleDragStart = (e, player) => {
    if (player.id !== playerId) return
    setDraggingCard(player.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Handle drop on slot
  const handleDrop = (e, slotIndex) => {
    e.preventDefault()
    if (draggingCard === playerId) {
      onUpdateSlot(slotIndex)
    }
    setDraggingCard(null)
  }

  // Handle click on slot (mobile-friendly)
  const handleSlotClick = (slotIndex) => {
    if (!currentPlayer) return
    onUpdateSlot(slotIndex)
  }

  // Handle card click to peek
  const handleCardClick = (player, e) => {
    e.stopPropagation()
    if (player.id === playerId) {
      onToggleHidden()
    }
  }

  const playersPlaced = players.filter(p => p.slot !== null).length
  const isRevealed = phase === 'revealed'

  return (
    <div className="game-board-screen">
      <div className="category-reminder">{category}</div>

      <div className="board-labels">
        <span>Low</span>
        <span>High</span>
      </div>

      <div className="game-board">
        <div className="board-track">
          {Array.from({ length: numSlots }).map((_, slotIndex) => {
            const playerInSlot = getPlayerInSlot(slotIndex)
            const isMySlot = playerInSlot?.id === playerId
            const isEmpty = !playerInSlot

            return (
              <div
                key={slotIndex}
                className={`board-slot ${isEmpty ? 'empty' : ''} ${isMySlot ? 'my-slot' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, slotIndex)}
                onClick={() => isEmpty || isMySlot ? handleSlotClick(slotIndex) : null}
              >
                {playerInSlot && (
                  <div
                    className={`player-card ${isMySlot ? 'mine' : ''} ${draggingCard === playerInSlot.id ? 'dragging' : ''}`}
                    draggable={isMySlot}
                    onDragStart={(e) => handleDragStart(e, playerInSlot)}
                    onClick={(e) => handleCardClick(playerInSlot, e)}
                  >
                    <div className="card-inner">
                      {isRevealed ? (
                        // Show everyone's number on reveal
                        <>
                          <span className="card-number revealed">{playerInSlot.number}</span>
                          <span className="card-name">{playerInSlot.name}</span>
                        </>
                      ) : isMySlot ? (
                        // My card - show number or hidden
                        <>
                          {playerInSlot.hidden ? (
                            <span className="card-hidden">?</span>
                          ) : (
                            <span className="card-number">{playerInSlot.number}</span>
                          )}
                          <span className="card-name">You</span>
                          <span className="card-hint">
                            {playerInSlot.hidden ? 'Tap to peek' : 'Tap to hide'}
                          </span>
                        </>
                      ) : (
                        // Other players' cards
                        <>
                          <span className="card-hidden">?</span>
                          <span className="card-name">{playerInSlot.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {isEmpty && (
                  <div className="slot-placeholder">
                    <span>{slotIndex + 1}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Unplaced players area */}
      {!isRevealed && (
        <div className="unplaced-area">
          {players.filter(p => p.slot === null).map(player => {
            const isMe = player.id === playerId
            return (
              <div
                key={player.id}
                className={`player-card unplaced ${isMe ? 'mine' : ''}`}
                draggable={isMe}
                onDragStart={(e) => handleDragStart(e, player)}
                onClick={(e) => isMe && handleCardClick(player, e)}
              >
                <div className="card-inner">
                  {isMe ? (
                    <>
                      {player.hidden ? (
                        <span className="card-hidden">?</span>
                      ) : (
                        <span className="card-number">{player.number}</span>
                      )}
                      <span className="card-name">You</span>
                      <span className="card-hint">Drag to a slot</span>
                    </>
                  ) : (
                    <>
                      <span className="card-hidden">?</span>
                      <span className="card-name">{player.name}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Status and actions */}
      {!isRevealed && (
        <div className="board-actions">
          {currentPlayer?.slot === null ? (
            <p className="board-hint">Drag your card to a position, or tap a slot</p>
          ) : isHost ? (
            <div>
              <p className="board-hint" style={{ marginBottom: '12px' }}>{playersPlaced}/{players.length} players placed</p>
              <button className="btn btn-primary" onClick={onReveal}>
                Reveal Numbers
              </button>
            </div>
          ) : (
            <p className="board-hint">Waiting for host to reveal...</p>
          )}
        </div>
      )}

      {/* Revealed phase actions */}
      {isRevealed && (
        <div className="board-actions revealed-actions">
          <h2>Results!</h2>
          <div className="button-group">
            {isHost ? (
              <button className="btn btn-primary" onClick={onNextRound}>
                Next Round
              </button>
            ) : (
              <p className="waiting">Waiting for host to start next round...</p>
            )}
            <button className="btn btn-secondary" onClick={onLeave}>
              Leave Game
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
