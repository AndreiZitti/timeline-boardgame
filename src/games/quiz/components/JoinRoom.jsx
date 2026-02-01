import { useState, useEffect } from 'react'

export function JoinRoom({
  onBack,
  onJoinRoom,
  loading,
  error,
  initialCode
}) {
  const [code, setCode] = useState(initialCode || '')

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim()) {
      onJoinRoom(code.trim().toUpperCase())
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
        <div className="quiz-join__field">
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
            autoFocus
            required
          />
        </div>

        <div className="quiz-join__actions">
          <button
            type="submit"
            className="quiz-btn quiz-btn--primary quiz-btn--large quiz-btn--full"
            disabled={!code.trim() || loading}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </form>
    </div>
  )
}
