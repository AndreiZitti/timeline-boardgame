import { useState } from 'react'
import { getPackList } from '../data/packs'
import { ALL_CATEGORIES } from '../data/questions-db'

// Question sources
const SOURCES = [
  {
    id: 'opentdb-db',
    name: 'Open Trivia Database',
    description: '1,200+ questions across 24 categories',
    hasFilters: true
  },
  {
    id: 'opentdb',
    name: 'Open Trivia (Live API)',
    description: 'Fresh questions from opentdb.com',
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
  const showFilters = source?.hasFilters && !room.board

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
              <li key={player.id} className={`player-item ${player.isBot ? 'is-bot' : ''}`}>
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
            <button className="btn btn-small" onClick={onAddBot} disabled={loading}>
              + Add Bot
            </button>
          )}
        </div>

        {isHost && !room.board && (
          <div className="pack-section">
            <h3>Select Question Source</h3>

            {/* Source selection */}
            {!showFilters && (
              <div className="source-list">
                {SOURCES.map(src => (
                  <button
                    key={src.id}
                    className={`pack-option ${selectedSource === src.id ? 'selected' : ''}`}
                    onClick={() => handleSourceSelect(src.id)}
                    disabled={loading}
                  >
                    <span className="pack-name">{src.name}</span>
                    <span className="pack-info">{src.description}</span>
                    {loading && selectedSource === src.id && (
                      <span className="loading-text">Loading questions...</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Filters for OpenTDB Database */}
            {showFilters && (
              <div className="filters-section">
                <button className="btn-back-small" onClick={() => setSelectedSource(null)}>
                  ← Back to sources
                </button>

                <h4>Categories ({filters.categories.length}/{ALL_CATEGORIES.length})</h4>
                <div className="filter-actions">
                  <button className="btn-text" onClick={selectAllCategories}>Select All</button>
                  <button className="btn-text" onClick={deselectAllCategories}>Deselect All</button>
                </div>
                <div className="filter-grid categories-grid">
                  {ALL_CATEGORIES.map(cat => (
                    <label key={cat.id} className="filter-chip">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span>{cat.short}</span>
                    </label>
                  ))}
                </div>

                <h4>Difficulty</h4>
                <div className="filter-grid">
                  {DIFFICULTIES.map(diff => (
                    <label key={diff.id} className="filter-chip">
                      <input
                        type="checkbox"
                        checked={filters.difficulties.includes(diff.id)}
                        onChange={() => toggleDifficulty(diff.id)}
                      />
                      <span>{diff.name}</span>
                    </label>
                  ))}
                </div>

                <h4>Question Type</h4>
                <div className="filter-grid">
                  {TYPES.map(type => (
                    <label key={type.id} className="filter-chip">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type.id)}
                        onChange={() => toggleType(type.id)}
                      />
                      <span>{type.name}</span>
                    </label>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleApplyFilters}
                  disabled={loading || filters.categories.length < 6}
                >
                  {loading ? 'Loading...' : 'Load Questions'}
                </button>
                {filters.categories.length < 6 && (
                  <p className="hint">Select at least 6 categories</p>
                )}
              </div>
            )}
          </div>
        )}

        {isHost && room.board && (
          <div className="pack-section">
            <h3>Questions Loaded ✓</h3>
            <p className="selected-pack">Ready to play!</p>
          </div>
        )}

        {!isHost && (
          <div className="waiting-section">
            <p>Waiting for host to select questions and start the game...</p>
            {room.board && (
              <p className="selected-pack">Questions loaded - ready to start!</p>
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
            disabled={!room.board || room.players.length < 2 || loading}
          >
            {loading ? 'Loading...' : 'Start Game'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onLeave} disabled={loading}>
          Leave Room
        </button>
      </div>

      {isHost && room.players.length < 2 && (
        <p className="hint">Need at least 2 players to start</p>
      )}
    </div>
  )
}
