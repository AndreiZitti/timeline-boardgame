import { useState } from 'react'
import { motion } from 'framer-motion'

export function RoomLobby({
  roomCode,
  players,
  currentPlayer,
  isHost,
  onStartGame,
  onLeave,
  onUpdateName
}) {
  const [myName, setMyName] = useState(currentPlayer?.name || '')

  // Check if all players have names
  const allPlayersNamed = players.every(p => p.name && p.name.trim())
  const myNameSet = myName.trim().length > 0
  const canStart = players.length >= 2 && allPlayersNamed

  const handleNameChange = (value) => {
    setMyName(value)
  }

  const handleNameBlur = () => {
    if (myName.trim() && myName !== currentPlayer?.name) {
      onUpdateName(myName.trim())
    }
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  return (
    <motion.div
      className="screen room-lobby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="btn-back" onClick={onLeave}>
        &larr; Leave Room
      </button>

      {/* Room Code Display */}
      <motion.div
        className="room-code-display"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="label">Room Code</span>
        <span className="code wavelength-code">{roomCode}</span>
        <p className="share-hint">Share this code with friends!</p>
      </motion.div>

      {/* Name Input Section */}
      <motion.div
        className="name-input-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <label htmlFor="my-name">Your Name</label>
        <input
          id="my-name"
          type="text"
          value={myName}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          placeholder="Enter your name..."
          maxLength={20}
          autoComplete="off"
        />
        {myNameSet && <span className="name-check">✓</span>}
      </motion.div>

      {/* Players List */}
      <motion.div
        className="players-list wavelength-players"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map((player, index) => {
            const hasName = player.name && player.name.trim()
            return (
              <motion.li
                key={player.id}
                className={hasName ? '' : 'unnamed'}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                {hasName ? (
                  <>
                    <span className="player-avatar">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="player-name">{player.name}</span>
                    <span className="player-check">✓</span>
                  </>
                ) : (
                  <>
                    <span className="player-avatar">?</span>
                    <span className="player-unnamed">??? (entering name...)</span>
                  </>
                )}
                {index === 0 && <span className="host-badge">Host</span>}
              </motion.li>
            )
          })}
        </ul>
      </motion.div>

      {/* Waiting message or Start button */}
      <motion.div
        className="lobby-actions"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {isHost ? (
          <>
            {players.length < 2 && (
              <p className="waiting-message">
                Waiting for more players... (minimum 2)
              </p>
            )}
            {players.length >= 2 && !allPlayersNamed && (
              <p className="waiting-message">
                Waiting for all players to enter names...
              </p>
            )}
            <button
              className="btn btn-primary"
              onClick={onStartGame}
              disabled={!canStart}
            >
              Start Game
            </button>
          </>
        ) : (
          <p className="waiting-message">
            {!allPlayersNamed
              ? 'Waiting for all players to enter names...'
              : 'Waiting for host to start the game...'}
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
