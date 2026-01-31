import { useState, useCallback } from 'react'

export function Lobby({
  room,
  gameMode,
  isHost,
  onStartGame,
  onLeave,
  onAddBot,
  onRemoveBot,
  error,
  loading
}) {
  const [copied, setCopied] = useState(false)

  // Copy room code to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = room.code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [room.code])

  // Get player initials
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const modeLabel = 'Quick Game' // game_mode column not in DB yet
  const themeName = room.theme?.name || 'Mixed'
  const canStart = room.players.length >= 2

  return (
    <div className="quiz-game quiz-lobby">
      {/* Header */}
      <div className="quiz-lobby__header">
        <div className="quiz-lobby__info">
          <span className="quiz-lobby__mode">{modeLabel}</span>
          <span className="quiz-lobby__theme">Theme: {themeName}</span>
        </div>
        <div
          className={`quiz-room-code ${copied ? 'quiz-room-code--copied' : ''}`}
          onClick={handleCopyCode}
          title="Click to copy"
        >
          <span className="quiz-room-code__code">{room.code}</span>
          <span className="quiz-room-code__icon">{copied ? '✓' : '📋'}</span>
        </div>
      </div>

      {/* Error */}
      {error && <div className="quiz-error">{error}</div>}

      {/* Players */}
      <div className="quiz-lobby__players">
        <div className="quiz-lobby__players-header">
          <h3 className="quiz-lobby__players-title">Players</h3>
          <span className="quiz-lobby__players-count">{room.players.length}</span>
        </div>

        <ul className="quiz-player-list">
          {room.players.map((player, index) => (
            <li
              key={player.id}
              className={`quiz-player ${player.isBot ? 'quiz-player--bot' : ''}`}
            >
              <div className="quiz-player__avatar">
                {player.isBot ? '🤖' : getInitials(player.name)}
              </div>
              <span className="quiz-player__name">{player.name}</span>
              <div className="quiz-player__badges">
                {index === 0 && (
                  <span className="quiz-badge quiz-badge--host">Host</span>
                )}
                {player.isBot && (
                  <span className="quiz-badge quiz-badge--bot">Bot</span>
                )}
              </div>
              {isHost && player.isBot && (
                <button
                  className="quiz-player__remove"
                  onClick={() => onRemoveBot(player.id)}
                  title="Remove bot"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <button
            className="quiz-add-bot"
            onClick={onAddBot}
            disabled={loading || room.players.length >= 8}
          >
            + Add Bot
          </button>
        )}
      </div>

      {/* Share section */}
      <div className="quiz-lobby__share">
        <p className="quiz-lobby__share-label">Share this code to invite friends</p>
        <div className="quiz-lobby__share-code">
          <div
            className={`quiz-room-code ${copied ? 'quiz-room-code--copied' : ''}`}
            onClick={handleCopyCode}
          >
            <span className="quiz-room-code__label">Room:</span>
            <span className="quiz-room-code__code">{room.code}</span>
            <span className="quiz-room-code__icon">{copied ? '✓' : '📋'}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="quiz-lobby__actions">
        {isHost && (
          <button
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            onClick={onStartGame}
            disabled={!canStart || loading}
          >
            {loading ? 'Loading...' : 'Start Game'}
          </button>
        )}
        {!isHost && (
          <div className="quiz-btn quiz-btn--secondary quiz-btn--large quiz-btn--full" style={{ cursor: 'default' }}>
            Waiting for host to start...
          </div>
        )}
        <button
          className="quiz-btn quiz-btn--ghost quiz-btn--full"
          onClick={onLeave}
          disabled={loading}
        >
          Leave Room
        </button>
      </div>

      {isHost && !canStart && (
        <p className="quiz-lobby__hint">Need at least 2 players to start</p>
      )}
    </div>
  )
}
