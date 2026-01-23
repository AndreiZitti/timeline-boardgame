import { useState } from 'react'

export function CreateRoom({ onBack, onCreateRoom, loading, error, savedName }) {
  const [name, setName] = useState(savedName || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onCreateRoom(name.trim())
    }
  }

  return (
    <div className="screen quiz-create">
      <button className="btn-back" onClick={onBack}>
        &larr; Back
      </button>

      <h2>Create Game</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="hostName">Your Name</label>
          <input
            id="hostName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
            disabled={loading}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !name.trim()}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}
