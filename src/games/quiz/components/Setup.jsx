import { useState } from 'react'

// Theme options with category mappings
const THEMES = [
  { id: 'mixed', name: 'Mixed', icon: '🎲', categories: null },
  { id: 'science', name: 'Science', icon: '🔬', categories: [17, 18, 19, 30] },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', categories: [11, 12, 14, 15, 29, 31] },
  { id: 'culture', name: 'Culture', icon: '🌍', categories: [22, 23, 25, 20] },
  { id: 'popculture', name: 'Pop Culture', icon: '⭐', categories: [26, 11, 12, 14] },
  { id: 'sports', name: 'Sports', icon: '🏆', categories: [21, 28, 16, 27] }
]

export function Setup({
  gameMode,
  onBack,
  onCreateRoom,
  loading,
  error,
  savedName
}) {
  const [name, setName] = useState(savedName || '')
  const [selectedTheme, setSelectedTheme] = useState('mixed')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      const theme = THEMES.find(t => t.id === selectedTheme)
      onCreateRoom(name.trim(), theme)
    }
  }

  const modeLabel = gameMode === 'quick' ? 'Quick Game' : 'Classic Game'

  return (
    <div className="quiz-game quiz-setup">
      <button className="quiz-back" onClick={onBack}>
        ← Back
      </button>

      <div className="quiz-setup__header">
        <h1 className="quiz-title">{modeLabel}</h1>
        <p className="quiz-subtitle">
          {gameMode === 'quick' 
            ? '5 rapid-fire questions' 
            : 'Full board with 30 questions'}
        </p>
      </div>

      {error && <div className="quiz-error">{error}</div>}

      <form className="quiz-setup__form" onSubmit={handleSubmit}>
        <div className="quiz-setup__field">
          <label className="quiz-label" htmlFor="player-name">
            Your Name
          </label>
          <input
            id="player-name"
            type="text"
            className="quiz-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
            required
          />
        </div>

        <div className="quiz-setup__field">
          <label className="quiz-label">
            Choose a Theme
          </label>
          <div className="quiz-themes">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                type="button"
                className={`quiz-theme ${selectedTheme === theme.id ? 'quiz-theme--selected' : ''}`}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <span className="quiz-theme__icon">{theme.icon}</span>
                <span className="quiz-theme__name">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-setup__actions">
          <button
            type="submit"
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            disabled={!name.trim() || loading}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </form>
    </div>
  )
}

export { THEMES }
