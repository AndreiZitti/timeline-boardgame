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
    <div className="screen create-room">
      <button className="btn-back" onClick={onBack}>&larr; Back</button>

      <h1>Create Room</h1>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
            autoComplete="off"
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!name.trim() || loading}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}
