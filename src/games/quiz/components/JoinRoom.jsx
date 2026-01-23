import { useState, useEffect } from 'react'

export function JoinRoom({ onBack, onJoinRoom, loading, error, savedName, initialCode }) {
  const [name, setName] = useState(savedName || '')
  const [code, setCode] = useState(initialCode || '')

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim() && code.trim()) {
      onJoinRoom(code.trim().toUpperCase(), name.trim())
    }
  }

  return (
    <div className="screen quiz-join">
      <button className="btn-back" onClick={onBack}>
        &larr; Back
      </button>

      <h2>Join Game</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="roomCode">Room Code</label>
          <input
            id="roomCode"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            maxLength={5}
            autoFocus
            disabled={loading}
            className="room-code-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="playerName">Your Name</label>
          <input
            id="playerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            disabled={loading}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !name.trim() || !code.trim()}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
