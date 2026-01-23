import { useState, useCallback } from 'react'
import { ALL_CATEGORIES } from '../data/questions-db'
import { PackCard } from './PackCard'

// Question sources with metadata
const SOURCES = [
  {
    id: 'opentdb-db',
    name: 'Open Trivia Database',
    description: 'Curated questions from our database',
    questionCount: '1,200+',
    categoryCount: 24,
    hasFilters: true
  },
  {
    id: 'opentdb',
    name: 'Open Trivia (Live API)',
    description: 'Fresh questions from opentdb.com',
    questionCount: '4,000+',
    categoryCount: 24,
    hasFilters: false
  }
]

// Difficulty options
const DIFFICULTIES = [
  { id: 'easy', name: 'Easy' },
  { id: 'medium', name: 'Medium' },
  { id: 'hard', name: 'Hard' }
]

// Type options
const TYPES = [
  { id: 'multiple', name: 'Multiple Choice' },
  { id: 'boolean', name: 'True / False' }
]

export function Lobby({
  room,
  isHost,
  onSelectPack,
  onStartGame,
  onLeave,
  onAddBot,
  onRemoveBot,
  error,
  loading
}) {
  // Pack selection state
  const [selectedSource, setSelectedSource] = useState(null)
  const [filters, setFilters] = useState({
    categories: ALL_CATEGORIES.map(c => c.id), // All enabled by default
    difficulties: ['easy', 'medium', 'hard'],
    types: ['multiple', 'boolean']
  })

  // Copy feedback state
  const [copied, setCopied] = useState(false)

  // Copy room code to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      // Fallback for older browsers
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

  const handleSourceSelect = (sourceId) => {
    setSelectedSource(sourceId)
    // Auto-select if no filters needed
    const source = SOURCES.find(s => s.id === sourceId)
    if (!source?.hasFilters) {
      onSelectPack(sourceId)
    }
  }

  const handleApplyFilters = () => {
    // Pass source ID + filters to parent
    onSelectPack(selectedSource, filters)
  }

  const toggleCategory = (catId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(id => id !== catId)
        : [...prev.categories, catId]
    }))
  }

  const toggleDifficulty = (diffId) => {
    setFilters(prev => ({
      ...prev,
      difficulties: prev.difficulties.includes(diffId)
        ? prev.difficulties.filter(id => id !== diffId)
        : [...prev.difficulties, diffId]
    }))
  }

  const toggleType = (typeId) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(typeId)
        ? prev.types.filter(id => id !== typeId)
        : [...prev.types, typeId]
    }))
  }

  const selectAllCategories = () => {
    setFilters(prev => ({ ...prev, categories: ALL_CATEGORIES.map(c => c.id) }))
  }

  const deselectAllCategories = () => {
    setFilters(prev => ({ ...prev, categories: [] }))
  }

  const source = SOURCES.find(s => s.id === selectedSource)
  const showCategoryBrowser = source?.hasFilters && !room.board

  // Get player initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="screen quiz-lobby quiz-game">
      {/* Header with room code */}
      <div className="lobby-header">
        <h2>Quiz Lobby</h2>
        <div
          className={`room-code-display ${copied ? 'room-code-display--copied' : ''}`}
          onClick={handleCopyCode}
          title="Click to copy room code"
        >
          <span className="label">Room:</span>
          <span className="code">{room.code}</span>
          <span className="copy-icon">{copied ? '✓' : '📋'}</span>
          {copied && <span className="room-code-toast">Copied!</span>}
        </div>
      </div>

      {/* Error message */}
      {error && <div className="lobby-error">{error}</div>}

      {/* Main content - two column layout */}
      <div className="lobby-content">
        {/* Players Section */}
        <div className="players-section">
          <h3>
            Players
            <span className="player-count">{room.players.length}</span>
          </h3>
          <ul className="player-list">
            {room.players.map((player, index) => (
              <li key={player.id} className={`player-item ${player.isBot ? 'is-bot' : ''}`}>
                <div className="player-avatar">
                  {player.isBot ? '🤖' : getInitials(player.name)}
                </div>
                <span className="player-name">{player.name}</span>
                {index === 0 && <span className="host-badge">Host</span>}
                {player.isBot && <span className="bot-badge">Bot</span>}
                {isHost && player.isBot && (
                  <button
                    className="btn-remove-bot"
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
              className="btn-add-bot"
              onClick={onAddBot}
              disabled={loading}
            >
              + Add Bot
            </button>
          )}
        </div>

        {/* Pack Section - Host view */}
        {isHost && !room.board && (
          <div className="pack-section">
            <h3>Select Question Pack</h3>

            {/* Pack Cards Grid - Show when no source selected or source has no filters */}
            {!showCategoryBrowser && (
              <div className="pack-grid">
                {SOURCES.map(src => (
                  <PackCard
                    key={src.id}
                    id={src.id}
                    name={src.name}
                    description={src.description}
                    questionCount={src.questionCount}
                    categoryCount={src.categoryCount}
                    selected={selectedSource === src.id}
                    loading={loading && selectedSource === src.id}
                    onClick={() => handleSourceSelect(src.id)}
                  />
                ))}
              </div>
            )}

            {/* Category Browser - Show when source has filters */}
            {showCategoryBrowser && (
              <div className="category-browser">
                <div className="category-browser__header">
                  <button className="btn-back" onClick={() => setSelectedSource(null)}>
                    ← Back to packs
                  </button>
                </div>

                {/* Categories Filter */}
                <div className="filter-group">
                  <div className="filter-group__header">
                    <h4 className="filter-group__title">
                      Categories
                      <span className="filter-group__count">
                        {filters.categories.length}/{ALL_CATEGORIES.length}
                      </span>
                    </h4>
                    <div className="filter-group__actions">
                      <button
                        className="btn-filter-action"
                        onClick={selectAllCategories}
                      >
                        Select All
                      </button>
                      <button
                        className="btn-filter-action"
                        onClick={deselectAllCategories}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="filter-chips filter-chips--categories">
                    {ALL_CATEGORIES.map(cat => (
                      <label
                        key={cat.id}
                        className={`filter-chip ${filters.categories.includes(cat.id) ? 'filter-chip--checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        <span className="filter-chip__check">
                          {filters.categories.includes(cat.id) ? '✓' : ''}
                        </span>
                        <span className="filter-chip__label">{cat.short}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div className="filter-group">
                  <div className="filter-group__header">
                    <h4 className="filter-group__title">Difficulty</h4>
                  </div>
                  <div className="filter-chips">
                    {DIFFICULTIES.map(diff => (
                      <label
                        key={diff.id}
                        className={`filter-chip ${filters.difficulties.includes(diff.id) ? 'filter-chip--checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.difficulties.includes(diff.id)}
                          onChange={() => toggleDifficulty(diff.id)}
                        />
                        <span className="filter-chip__check">
                          {filters.difficulties.includes(diff.id) ? '✓' : ''}
                        </span>
                        <span className="filter-chip__label">{diff.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Question Type Filter */}
                <div className="filter-group">
                  <div className="filter-group__header">
                    <h4 className="filter-group__title">Question Type</h4>
                  </div>
                  <div className="filter-chips">
                    {TYPES.map(type => (
                      <label
                        key={type.id}
                        className={`filter-chip ${filters.types.includes(type.id) ? 'filter-chip--checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.types.includes(type.id)}
                          onChange={() => toggleType(type.id)}
                        />
                        <span className="filter-chip__check">
                          {filters.types.includes(type.id) ? '✓' : ''}
                        </span>
                        <span className="filter-chip__label">{type.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Load Questions Button */}
                <button
                  className="btn-load-questions"
                  onClick={handleApplyFilters}
                  disabled={loading || filters.categories.length < 6}
                >
                  {loading ? 'Loading Questions...' : 'Load Questions'}
                </button>
                {filters.categories.length < 6 && (
                  <p className="filter-hint">Select at least 6 categories</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pack Ready State - Host view after board is loaded */}
        {isHost && room.board && (
          <div className="pack-section">
            <h3>Question Pack</h3>
            <div className="pack-ready">
              <span className="pack-ready__icon">✅</span>
              <h4 className="pack-ready__title">Questions Loaded</h4>
              <p className="pack-ready__subtitle">Ready to start the game!</p>
            </div>
          </div>
        )}

        {/* Waiting Section - Non-host view */}
        {!isHost && (
          <div className="waiting-section">
            {!room.board ? (
              <>
                <div className="waiting-section__spinner" />
                <p className="waiting-section__text">
                  Waiting for host to select questions...
                </p>
              </>
            ) : (
              <>
                <p className="waiting-section__text">
                  Waiting for host to start the game...
                </p>
                <div className="waiting-section__ready">
                  <span>✅</span>
                  <span>Questions loaded - ready to start!</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="lobby-actions">
        {isHost && (
          <button
            className="btn-start"
            onClick={onStartGame}
            disabled={!room.board || room.players.length < 2 || loading}
          >
            {loading ? 'Loading...' : 'Start Game'}
          </button>
        )}
        <button
          className="btn-leave"
          onClick={onLeave}
          disabled={loading}
        >
          Leave Room
        </button>
      </div>

      {/* Hint for minimum players */}
      {isHost && room.players.length < 2 && (
        <p className="lobby-hint">Need at least 2 players to start</p>
      )}
    </div>
  )
}
