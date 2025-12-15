export function GameHub({ playerName, onOpenProfile, onSelectGame }) {
  const games = [
    {
      id: 'hot-take',
      name: 'Hot Take',
      description: 'Where do you stand? Rank yourselves 1-100 on spicy topics.',
      available: true,
      accent: '#a855f7'
    },
    {
      id: 'like-minded',
      name: 'Like Minded',
      description: 'Give clues. Find the wavelength. Beat the game!',
      available: true,
      accent: '#06b6d4'
    }
  ]

  return (
    <div className="screen game-hub">
      <div className="hub-header">
        <div className="hub-profile">
          <button className="profile-button" onClick={onOpenProfile}>
            {playerName ? playerName.charAt(0).toUpperCase() : '?'}
          </button>
          <span className="hub-player-name">{playerName || 'Guest'}</span>
        </div>
      </div>

      <div className="hub-content">
        <h1 className="hub-title">Party Games</h1>
        <p className="hub-subtitle">Choose a game to play with friends</p>

        <div className="games-list">
          {games.map((game) => (
            <button
              key={game.id}
              className={`game-card ${!game.available ? 'coming-soon' : ''}`}
              onClick={() => game.available && onSelectGame(game.id)}
              disabled={!game.available}
              style={{ '--game-accent': game.accent }}
            >
              <div className="game-card-content">
                <h2 className="game-name">{game.name}</h2>
                <p className="game-description">{game.description}</p>
                {!game.available && (
                  <span className="coming-soon-badge">Coming Soon</span>
                )}
              </div>
              {game.available && (
                <span className="game-arrow">&rarr;</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
