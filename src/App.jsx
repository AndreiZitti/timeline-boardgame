import { useState, useEffect } from 'react'
import { GameHub } from './components/GameHub'
import { Profile } from './components/Profile'
import { HotTakeGame } from './games/hot-take'
import { LikeMindedGame } from './games/like-minded'

// Get saved player name from localStorage
function getSavedName() {
  return localStorage.getItem('playerName') || ''
}

// Get player ID
function getPlayerId() {
  let id = localStorage.getItem('playerId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('playerId', id)
  }
  return id
}

// Get profile stats from localStorage
function getProfileStats() {
  return {
    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0', 10),
    gamesHosted: parseInt(localStorage.getItem('gamesHosted') || '0', 10)
  }
}

function App() {
  const [currentGame, setCurrentGame] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [savedName, setSavedName] = useState(getSavedName)
  const [playerId] = useState(getPlayerId)
  const [profileStats, setProfileStats] = useState(getProfileStats)

  // Update profile name
  const updateProfileName = (name) => {
    localStorage.setItem('playerName', name)
    setSavedName(name)
  }

  // Refresh profile stats periodically when returning to hub
  useEffect(() => {
    if (!currentGame) {
      setProfileStats(getProfileStats())
    }
  }, [currentGame])

  // Profile object
  const profile = {
    playerId,
    name: savedName,
    ...profileStats
  }

  // Handle game selection
  const handleSelectGame = (gameId) => {
    setCurrentGame(gameId)
  }

  // Handle returning to hub
  const handleBackToHub = () => {
    setCurrentGame(null)
    // Refresh stats when returning
    setProfileStats(getProfileStats())
  }

  // Render selected game
  if (currentGame === 'hot-take') {
    return (
      <HotTakeGame
        onBack={handleBackToHub}
        savedName={savedName}
        onUpdateName={updateProfileName}
      />
    )
  }

  if (currentGame === 'like-minded') {
    return (
      <LikeMindedGame
        onBack={handleBackToHub}
      />
    )
  }

  // Render game hub (default)
  return (
    <>
      <GameHub
        playerName={savedName}
        onOpenProfile={() => setShowProfile(true)}
        onSelectGame={handleSelectGame}
      />
      <Profile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onUpdateName={updateProfileName}
      />
    </>
  )
}

export default App
