import { useState } from 'react'
import { motion } from 'framer-motion'

export function Setup({ onStartGame, onBack }) {
  const [playerCount, setPlayerCount] = useState(3)
  const [playerNames, setPlayerNames] = useState(['', '', ''])

  const handleCountChange = (count) => {
    setPlayerCount(count)
    // Adjust names array
    const newNames = [...playerNames]
    while (newNames.length < count) {
      newNames.push('')
    }
    setPlayerNames(newNames.slice(0, count))
  }

  const handleNameChange = (index, name) => {
    const newNames = [...playerNames]
    newNames[index] = name
    setPlayerNames(newNames)
  }

  const handleStart = () => {
    // Fill in default names for empty slots
    const names = playerNames.map((name, i) => name.trim() || `Player ${i + 1}`)
    onStartGame(names)
  }

  return (
    <motion.div
      className="screen like-minded-setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="btn-back" onClick={onBack}>
        &larr; Back
      </button>

      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Game Setup
      </motion.h1>
      <motion.p
        className="subtitle"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        How many players?
      </motion.p>

      <motion.div
        className="setup-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <label>Number of Players</label>
        <div className="player-count-selector">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
            <button
              key={count}
              className={`count-btn ${playerCount === count ? 'active' : ''}`}
              onClick={() => handleCountChange(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="setup-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <label>Player Names (Optional)</label>
        <div className="player-names-list">
          {playerNames.map((name, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Player ${index + 1}`}
              value={name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              maxLength={20}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="button-group"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button className="btn btn-primary" onClick={handleStart}>
          Start Game
        </button>
      </motion.div>
    </motion.div>
  )
}
