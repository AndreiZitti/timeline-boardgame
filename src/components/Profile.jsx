import { useState } from 'react'

export function Profile({ isOpen, onClose, profile, onUpdateName }) {
  const [name, setName] = useState(profile.name || '')
  const [isEditing, setIsEditing] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    if (name.trim()) {
      onUpdateName(name.trim())
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setName(profile.name || '')
      setIsEditing(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2>Profile</h2>

        <div className="profile-section">
          <label>Name</label>
          {isEditing ? (
            <div className="profile-edit-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={20}
                autoFocus
              />
              <button className="btn btn-small btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          ) : (
            <div className="profile-display-row">
              <span className="profile-value">{profile.name || 'Not set'}</span>
              <button className="btn btn-small btn-secondary" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="profile-stats">
          <h3>Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{profile.gamesPlayed || 0}</span>
              <span className="stat-label">Games Played</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.gamesHosted || 0}</span>
              <span className="stat-label">Games Hosted</span>
            </div>
          </div>
        </div>

        <div className="profile-id">
          <span className="profile-id-label">Player ID</span>
          <span className="profile-id-value">{profile.playerId?.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  )
}
