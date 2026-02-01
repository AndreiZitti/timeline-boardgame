import { useState, useCallback, useEffect } from 'react'

const CATEGORY_OPTIONS = [
  { id: 'mixed', name: 'Mixed', icon: '🎲' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'history', name: 'History', icon: '📜' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'language', name: 'Language', icon: '📝' },
  { id: 'random', name: 'Random', icon: '🎯' }
]

export function Lobby({
  room,
  isHost,
  playerId,
  currentPlayer,
  onStartGame,
  onLeave,
  onAddBot,
  onRemoveBot,
  onSetPlayerName,
  onSetGameMode,
  onSetCategory,
  allPlayersNamed,
  error,
  loading
}) {
  const [copied, setCopied] = useState(null) // null | 'code' | 'link'
  const [nameInput, setNameInput] = useState(currentPlayer?.name || '')
  const [nameSubmitted, setNameSubmitted] = useState(!!currentPlayer?.name)

  // Sync when currentPlayer changes (rejoin)
  useEffect(() => {
    if (currentPlayer?.name) {
      setNameInput(currentPlayer.name)
      setNameSubmitted(true)
    }
  }, [currentPlayer?.name])

  // Build full room link
  const getRoomLink = useCallback(() => {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('room', room.code)
    url.searchParams.delete('session') // Don't share session token
    return url.toString()
  }, [room.code])

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    }
  }, [])

  // Copy room code to clipboard
  const handleCopyCode = useCallback(async () => {
    await copyToClipboard(room.code)
    setCopied('code')
    setTimeout(() => setCopied(null), 1500)
  }, [room.code, copyToClipboard])

  // Copy full link to clipboard
  const handleCopyLink = useCallback(async () => {
    await copyToClipboard(getRoomLink())
    setCopied('link')
    setTimeout(() => setCopied(null), 1500)
  }, [getRoomLink, copyToClipboard])

  // Get player initials
  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Handle name submission
  const handleNameSubmit = useCallback(() => {
    const trimmedName = nameInput.trim()
    if (trimmedName && onSetPlayerName) {
      onSetPlayerName(trimmedName)
      setNameSubmitted(true)
    }
  }, [nameInput, onSetPlayerName])

  // Handle name input key press
  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }

  // Handle name input change
  const handleNameChange = (e) => {
    setNameInput(e.target.value)
    setNameSubmitted(false)
  }

  const gameMode = room.game_mode || 'quick'
  const category = room.category || { id: 'mixed', name: 'Mixed' }
  const canStart = room.players.length >= 2 && allPlayersNamed

  return (
    <div className="quiz-game quiz-lobby">
      {/* Header with room code */}
      <div className="quiz-lobby__header">
        <div className="quiz-lobby__info">
          <span className="quiz-lobby__mode">{gameMode === 'quick' ? 'Quick Game' : 'Classic Game'}</span>
          <span className="quiz-lobby__theme">Category: {category.name}</span>
        </div>
        <div
          className={`quiz-room-code ${copied === 'code' ? 'quiz-room-code--copied' : ''}`}
          onClick={handleCopyCode}
          title="Click to copy code"
        >
          <span className="quiz-room-code__code">{room.code}</span>
          <span className="quiz-room-code__icon">{copied === 'code' ? '✓' : '📋'}</span>
        </div>
      </div>

      {/* Error */}
      {error && <div className="quiz-error">{error}</div>}

      {/* Name input section */}
      <div className="quiz-lobby__name-section">
        <label className="quiz-label">Your Name</label>
        <div className="quiz-lobby__name-input-wrapper">
          <input
            type="text"
            className="quiz-input quiz-lobby__name-input"
            value={nameInput}
            onChange={handleNameChange}
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSubmit}
            placeholder="Enter your name..."
            maxLength={20}
          />
          {nameSubmitted && nameInput.trim() && (
            <span className="quiz-lobby__name-check">✓</span>
          )}
        </div>
      </div>

      {/* Game Type Cards */}
      <div className="quiz-lobby__section">
        <label className="quiz-label">Game Type {!isHost && <span className="quiz-label--hint">(host only)</span>}</label>
        <div className="quiz-lobby__mode-cards">
          <button
            className={`quiz-mode-card quiz-mode-card--compact ${gameMode === 'quick' ? 'quiz-mode-card--selected' : ''}`}
            onClick={() => isHost && onSetGameMode && onSetGameMode('quick')}
            disabled={!isHost}
          >
            <span className="quiz-mode-card__icon">⚡</span>
            <div className="quiz-mode-card__content">
              <span className="quiz-mode-card__title">Quick</span>
              <span className="quiz-mode-card__desc">10 rounds, wager points</span>
            </div>
          </button>
          <button
            className={`quiz-mode-card quiz-mode-card--compact ${gameMode === 'classic' ? 'quiz-mode-card--selected' : ''}`}
            onClick={() => isHost && onSetGameMode && onSetGameMode('classic')}
            disabled={!isHost}
          >
            <span className="quiz-mode-card__icon">📋</span>
            <div className="quiz-mode-card__content">
              <span className="quiz-mode-card__title">Classic</span>
              <span className="quiz-mode-card__desc">Jeopardy-style board</span>
            </div>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="quiz-lobby__section">
        <label className="quiz-label">Category {!isHost && <span className="quiz-label--hint">(host only)</span>}</label>
        <div className="quiz-lobby__categories">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat.id}
              className={`quiz-category-pill ${category.id === cat.id ? 'quiz-category-pill--selected' : ''}`}
              onClick={() => isHost && onSetCategory && onSetCategory({ id: cat.id, name: cat.name })}
              disabled={!isHost}
            >
              <span className="quiz-category-pill__icon">{cat.icon}</span>
              <span className="quiz-category-pill__name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Players */}
      <div className="quiz-lobby__players">
        <div className="quiz-lobby__players-header">
          <h3 className="quiz-lobby__players-title">Players</h3>
          <span className="quiz-lobby__players-count">{room.players.length}</span>
        </div>

        <ul className="quiz-player-list">
          {room.players.map((player, index) => {
            const hasName = !!player.name
            return (
              <li
                key={player.id}
                className={`quiz-player ${player.isBot ? 'quiz-player--bot' : ''} ${!hasName ? 'quiz-player--unnamed' : ''}`}
              >
                <div className="quiz-player__avatar">
                  {player.isBot ? '🤖' : getInitials(player.name)}
                </div>
                <span className="quiz-player__name">
                  {hasName ? player.name : <em>Entering name...</em>}
                </span>
                <div className="quiz-player__badges">
                  {hasName && !player.isBot && (
                    <span className="quiz-player__check">✓</span>
                  )}
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
            )
          })}
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
        <button
          className={`quiz-share-link ${copied === 'link' ? 'quiz-share-link--copied' : ''}`}
          onClick={handleCopyLink}
        >
          <span className="quiz-share-link__icon">🔗</span>
          <span className="quiz-share-link__text">
            {copied === 'link' ? 'Link copied!' : 'Copy invite link'}
          </span>
        </button>
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
        <p className="quiz-lobby__hint">
          {room.players.length < 2
            ? 'Need at least 2 players to start'
            : 'Waiting for all players to enter their names...'}
        </p>
      )}
    </div>
  )
}
