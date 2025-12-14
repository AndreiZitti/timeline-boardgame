import { useState } from 'react'

export function JoinRoom({ onBack, onJoinRoom, loading, error, savedName, initialCode }) {
  const [code, setCode] = useState(initialCode || '')
  const [name, setName] = useState(savedName || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim() && name.trim()) {
      onJoinRoom(code.trim().toUpperCase(), name.trim())
    }
  }

  // Focus on name if we have a code from URL, otherwise focus on code
  const codeAutoFocus = !initialCode
  const nameAutoFocus = initialCode && !savedName

  return (
    <div className="screen join-room">
      <button className="btn-back" onClick={onBack}>&larr; Back</button>

      <h1>Join Room</h1>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="code">Room Code</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1"
            maxLength={5}
            autoFocus={codeAutoFocus}
            autoComplete="off"
            className="code-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus={nameAutoFocus}
            autoComplete="off"
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!code.trim() || !name.trim() || loading}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
