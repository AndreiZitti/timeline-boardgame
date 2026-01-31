import { useState } from "react";
import { RentzSetup } from "./RentzSetup";

export function PlayerSetup({ config, onStart, onStartTeamGame, onStartRentz, defaultRentzConfig }) {
  const isTeamGame = config.isTeamGame || false;
  const isRentz = config.name === "Rentz";
  const isWhist = config.name === "Whist";
  const isFixed = config.minPlayers === config.maxPlayers;
  const [playerCount, setPlayerCount] = useState(config.minPlayers);
  const [setupStep, setSetupStep] = useState("players"); // "players" or "rentz-config"
  const [whistMode, setWhistMode] = useState('1-8-1'); // '1-8-1' or '8-1-8'

  // For individual games
  const [names, setNames] = useState(
    Array(config.maxPlayers).fill("").map((_, i) => `Player ${i + 1}`)
  );

  // For team games (Septica)
  const [teams, setTeams] = useState([
    { name: "Team 1", players: ["Player 1", "Player 2"] },
    { name: "Team 2", players: ["Player 3", "Player 4"] },
  ]);

  const handleNameChange = (index, value) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleTeamNameChange = (teamIndex, value) => {
    setTeams((prev) => {
      const next = [...prev];
      next[teamIndex] = { ...next[teamIndex], name: value };
      return next;
    });
  };

  const handleTeamPlayerChange = (teamIndex, playerIndex, value) => {
    setTeams((prev) => {
      const next = [...prev];
      const players = [...next[teamIndex].players];
      players[playerIndex] = value;
      next[teamIndex] = { ...next[teamIndex], players };
      return next;
    });
  };

  const handleStart = () => {
    if (isTeamGame) {
      // Format: [[teamName, player1, player2], [teamName, player3, player4]]
      const teamData = teams.map((team) => [
        team.name.trim() || "Team",
        ...team.players.map((p, i) => p.trim() || `Player ${i + 1}`),
      ]);
      onStartTeamGame(teamData);
    } else if (isRentz) {
      // For Rentz, go to config step
      setSetupStep("rentz-config");
    } else if (isWhist) {
      const playerNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
      onStart(playerNames, { whistMode });
    } else {
      const playerNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
      onStart(playerNames);
    }
  };

  const handleRentzStart = (rentzConfig) => {
    const playerNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStartRentz(playerNames, rentzConfig);
  };

  const handleBackToPlayers = () => {
    setSetupStep("players");
  };

  const canStart = isTeamGame
    ? teams.every((t) => t.name.trim().length > 0 && t.players.every((p) => p.trim().length > 0))
    : names.slice(0, playerCount).every((n) => n.trim().length > 0);

  // Rentz config step
  if (isRentz && setupStep === "rentz-config") {
    return (
      <RentzSetup
        defaultConfig={defaultRentzConfig}
        onStart={handleRentzStart}
        onBack={handleBackToPlayers}
      />
    );
  }

  if (isTeamGame) {
    // For Septica: show alternating seating order (A1, B1, A2, B2)
    const isSeptica = config.name === "Septica";

    return (
      <div className="player-setup">
        <h2 className="player-setup-title">{config.name}</h2>
        <p className="setup-subtitle">2 teams of 2 players each</p>

        {/* Team name inputs */}
        <div className="teams-names-row">
          {teams.map((team, teamIndex) => (
            <div key={teamIndex} className="team-name-card">
              <input
                type="text"
                className="team-name-input"
                placeholder={`Team ${teamIndex + 1}`}
                value={team.name}
                onChange={(e) => handleTeamNameChange(teamIndex, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Seating order - alternating for Septica */}
        {isSeptica ? (
          <>
            <p className="seating-label">Seating order (clockwise):</p>
            <div className="seating-order">
              {[0, 1, 0, 1].map((teamIdx, seatIdx) => {
                const playerIdx = seatIdx < 2 ? 0 : 1;
                const actualTeamIdx = seatIdx % 2;
                return (
                  <div key={seatIdx} className="seating-slot">
                    <span className="seat-number">{seatIdx + 1}</span>
                    <input
                      type="text"
                      className="team-player-input"
                      placeholder={`${teams[actualTeamIdx].name || `Team ${actualTeamIdx + 1}`} P${playerIdx + 1}`}
                      value={teams[actualTeamIdx].players[playerIdx]}
                      onChange={(e) => handleTeamPlayerChange(actualTeamIdx, playerIdx, e.target.value)}
                    />
                    <span className="seat-team">{teams[actualTeamIdx].name || `Team ${actualTeamIdx + 1}`}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="teams-setup">
            {teams.map((team, teamIndex) => (
              <div key={teamIndex} className="team-card">
                <div className="team-players">
                  {team.players.map((player, playerIndex) => (
                    <input
                      key={playerIndex}
                      type="text"
                      className="team-player-input"
                      placeholder={`Player ${teamIndex * 2 + playerIndex + 1}`}
                      value={player}
                      onChange={(e) => handleTeamPlayerChange(teamIndex, playerIndex, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="button-group">
          <button className="btn btn-primary" onClick={handleStart} disabled={!canStart}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-setup">
      <h2 className="player-setup-title">{config.name}</h2>

      {!isFixed && (
        <div className="player-count-selector">
          <label>Number of players:</label>
          <div className="player-count-buttons">
            {Array.from({ length: config.maxPlayers - config.minPlayers + 1 }, (_, i) => config.minPlayers + i).map((count) => (
              <button
                key={count}
                className={`player-count-btn ${playerCount === count ? "active" : ""}`}
                onClick={() => setPlayerCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="player-names">
        <h3>Player Names</h3>
        {Array.from({ length: playerCount }).map((_, i) => (
          <input
            key={i}
            type="text"
            className="player-name-input"
            placeholder={`Player ${i + 1}`}
            value={names[i]}
            onChange={(e) => handleNameChange(i, e.target.value)}
          />
        ))}
      </div>

      {isWhist && (
        <div className="whist-mode-selector">
          <h3>Round Pattern</h3>
          <div className="mode-buttons">
            <button
              type="button"
              className={`mode-btn ${whistMode === '1-8-1' ? 'active' : ''}`}
              onClick={() => setWhistMode('1-8-1')}
            >
              <span className="mode-label">1 → 8 → 1</span>
              <span className="mode-desc">Start with 1 card</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${whistMode === '8-1-8' ? 'active' : ''}`}
              onClick={() => setWhistMode('8-1-8')}
            >
              <span className="mode-label">8 → 1 → 8</span>
              <span className="mode-desc">Start with 8 cards</span>
            </button>
          </div>
        </div>
      )}

      <div className="button-group">
        <button className="btn btn-primary" onClick={handleStart} disabled={!canStart}>
          {isRentz ? "Next: Configure Scoring" : "Start Game"}
        </button>
      </div>
    </div>
  );
}
