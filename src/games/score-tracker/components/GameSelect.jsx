export function GameSelect({ onSelect, GAME_CONFIG }) {
  const games = [
    { type: "septica", icon: "7" },
    { type: "whist", icon: "W" },
    { type: "rentz", icon: "R" },
    { type: "general", icon: "+" },
  ];

  const getPlayerDescription = (type) => {
    const cfg = GAME_CONFIG[type];
    if (cfg.minPlayers === cfg.maxPlayers) {
      return `${cfg.minPlayers} players`;
    }
    return `${cfg.minPlayers}-${cfg.maxPlayers} players`;
  };

  return (
    <div className="game-select">
      <h2 className="game-select-title">Choose a Game</h2>
      <div className="game-select-grid">
        {games.map((game) => (
          <button
            key={game.type}
            className="game-select-card"
            onClick={() => onSelect(game.type)}
          >
            <span className="game-select-icon">{game.icon}</span>
            <span className="game-select-name">{GAME_CONFIG[game.type].name}</span>
            <span className="game-select-players">{getPlayerDescription(game.type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
