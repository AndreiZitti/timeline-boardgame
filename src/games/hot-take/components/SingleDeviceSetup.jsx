import { useState } from 'react'

const CATEGORIES = {
  safe: {
    label: 'Safe',
    items: [
      "Superpowers from least to most powerful",
      "Worst to best places to start dancing uncontrollably",
      "Dance moves from worst to best",
      "Fragrances and smells from worst to best",
      "Easiest to hardest things to give up for the rest of your life",
      "Celebrities from weakest to strongest in a fight",
      "Things you could purchase for $10,000 from least to most practical",
      "Scenarios from least to most annoying",
      "Worst to best reasons to go on a quest",
      "Things that are least to most cute",
      "Musical artists or acts from worst to best",
      "Animals and fantasy creatures from least to most cool to have as a pet",
      "Movies and TV shows from least to most likely to make you laugh",
      "Desserts or sweets from worst to best",
      "Fast food menu items from worst to best",
      "Things that would least to most likely scare you",
      "Fictional characters from weakest to strongest in a fight",
      "Hobbies from least to most interesting",
      "Video games from least to most fun",
      "Sports from easiest to hardest to learn",
      "Countries from least to most interesting to visit",
      "Pizza toppings from worst to best",
      "Board games from least to most fun",
      "Types of weather from worst to best",
      "Sandwiches from worst to best"
    ]
  },
  nsfw: {
    label: 'NSFW',
    items: [
      "Worst to best ways to commit a murder and try to get away with it",
      "Worst to best things to get tattooed",
      "Worst to best ways to make money",
      "Things to put on your dating profile from least to most successful",
      "Worst to best questions to ask on a first date",
      "Worst to best things to do on a first date",
      "Worst to best ways to break up with someone",
      "Worst to best excuses for being late",
      "Alcoholic drinks from worst to best",
      "Fetishes from most normal to strangest",
      "Worst to best ways to die",
      "Worst to best things to do naked",
      "Places to fart loudly from best to worst"
    ]
  },
  classic: {
    label: 'Classic',
    items: [
      "How spicy do you like your food?",
      "How much do you enjoy mornings?",
      "How adventurous are you?",
      "How much do you like small talk?",
      "How organized is your desk?",
      "How likely are you to cry at movies?",
      "How comfortable are you with public speaking?",
      "How much do you enjoy cooking?",
      "How patient are you in traffic?",
      "How competitive are you?",
      "How tech-savvy are you?",
      "How much do you enjoy parties?",
      "How good are you at keeping secrets?",
      "How punctual are you?",
      "How good is your sense of direction?"
    ]
  }
}

export function SingleDeviceSetup({ onBack, onStartGame, initialPlayerNames }) {
  const [playerCount, setPlayerCount] = useState(initialPlayerNames?.length || 4)
  const [playerNames, setPlayerNames] = useState(
    initialPlayerNames || ['', '', '', '']
  )
  const [category, setCategory] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [enabledGroups, setEnabledGroups] = useState(['safe', 'classic'])
  const [selectedGroup, setSelectedGroup] = useState('safe')

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    setPlayerNames(prev => {
      const newNames = [...prev]
      while (newNames.length < count) {
        newNames.push('')
      }
      return newNames.slice(0, count)
    })
  }

  const handleNameChange = (index, name) => {
    setPlayerNames(prev => {
      const newNames = [...prev]
      newNames[index] = name
      return newNames
    })
  }

  const handleCategorySelect = (cat) => {
    setCategory(cat)
    setShowPicker(false)
  }

  const toggleGroup = (group) => {
    setEnabledGroups(prev => {
      if (prev.includes(group)) {
        if (prev.length === 1) return prev
        return prev.filter(g => g !== group)
      }
      return [...prev, group]
    })
  }

  const getRandomCategory = () => {
    const allEnabled = enabledGroups.flatMap(g => CATEGORIES[g].items)
    const random = allEnabled[Math.floor(Math.random() * allEnabled.length)]
    setCategory(random)
  }

  const handleStart = () => {
    // Fill empty names with default
    const finalNames = playerNames.map((name, i) =>
      name.trim() || `Player ${i + 1}`
    )
    onStartGame(finalNames, category)
  }

  const allNamesValid = playerNames.every((name, i) => name.trim() || true) // Allow empty (will use defaults)
  const canStart = category.trim()

  const currentGroupCategories = CATEGORIES[selectedGroup]?.items || []

  return (
    <div className="screen single-device-setup">
      <button className="btn-back" onClick={onBack}>&larr; Back</button>

      <h1>Single Device</h1>
      <p className="subtitle">Pass and play on one device</p>

      {/* Player Count */}
      <div className="setup-section">
        <label>Number of Players</label>
        <div className="player-count-selector">
          {[2, 3, 4, 5, 6, 7, 8].map(num => (
            <button
              key={num}
              className={`count-btn ${playerCount === num ? 'active' : ''}`}
              onClick={() => handlePlayerCountChange(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Player Names */}
      <div className="setup-section">
        <label>Player Names (optional)</label>
        <div className="player-names-list">
          {playerNames.map((name, index) => (
            <input
              key={index}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              placeholder={`Player ${index + 1}`}
              maxLength={15}
            />
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="setup-section">
        <label>Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Enter a category or pick one..."
          autoComplete="off"
        />
        <div className="category-buttons">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setShowPicker(!showPicker)}
          >
            {showPicker ? 'Hide' : 'Browse'}
          </button>
          <button
            type="button"
            className="btn btn-small btn-random"
            onClick={getRandomCategory}
          >
            Random
          </button>
        </div>

        {showPicker && (
          <div className="category-picker">
            <div className="group-toggles">
              <span className="toggles-label">Include:</span>
              {Object.entries(CATEGORIES).map(([key, group]) => (
                <button
                  key={key}
                  className={`toggle-chip ${enabledGroups.includes(key) ? 'active' : ''} ${key === 'nsfw' ? 'nsfw' : ''}`}
                  onClick={() => toggleGroup(key)}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="group-tabs">
              {Object.entries(CATEGORIES).map(([key, group]) => (
                <button
                  key={key}
                  className={`tab ${selectedGroup === key ? 'active' : ''} ${key === 'nsfw' ? 'nsfw' : ''}`}
                  onClick={() => setSelectedGroup(key)}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="category-list">
              {currentGroupCategories.map((cat, i) => (
                <button
                  key={i}
                  className="category-item"
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={!canStart}
        >
          {!category.trim() ? 'Pick a category to start' : 'Start Game'}
        </button>
      </div>
    </div>
  )
}
