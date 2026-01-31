import { useState, useEffect } from 'react'

export function JoinRoom({
  onBack,
  onJoinRoom,
  loading,
  error,
  savedName,
  initialCode
}) {
  const [code, setCode] = useState(initialCode || '')
  const [name, setName] = useState(savedName || '')

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim() && name.trim()) {
      onJoinRoom(code.trim().toUpperCase(), name.trim())
    }
  }

  return (
    <div className="quiz-game quiz-join">
      <button className="quiz-back" onClick={onBack}>
        ← Back
      </button>

      <div className="quiz-join__header">
        <h1 className="quiz-title">Join Room</h1>
        <p className="quiz-subtitle">Enter a room code to join a game</p>
      </div>

      {error && <div className="quiz-error">{error}</div>}

      <form className="quiz-join__form" onSubmit={handleSubmit}>
        <div className="quiz-setup__field">
          <label className="quiz-label" htmlFor="room-code">
            Room Code
          </label>
          <input
            id="room-code"
            type="text"
            className="quiz-input quiz-join__code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC12"
            maxLength={6}
            autoFocus={!initialCode}
            required
          />
        </div>

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
            autoFocus={!!initialCode}
            required
          />
        </div>

        <div className="quiz-join__actions">
          <button
            type="submit"
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            disabled={!code.trim() || !name.trim() || loading}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </form>
    </div>
  )
}
