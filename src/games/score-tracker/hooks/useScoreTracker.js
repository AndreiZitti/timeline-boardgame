import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "scoreTracker_";

// Generate Whist round pattern based on player count and mode:
// Mode '1-8-1': N x 1, 2-7, N x 8, 7-2, N x 1
// Mode '8-1-8': N x 8, 7-2, N x 1, 2-7, N x 8
function generateWhistRoundCards(playerCount, mode = '1-8-1') {
  const ones = Array(playerCount).fill(1);
  const ascending = [2, 3, 4, 5, 6, 7];
  const eights = Array(playerCount).fill(8);
  const descending = [7, 6, 5, 4, 3, 2];

  if (mode === '8-1-8') {
    return [...eights, ...descending, ...ones, ...ascending, ...eights];
  }
  // Default: 1-8-1
  return [...ones, ...ascending, ...eights, ...descending, ...ones];
}

// Generate full Whist data structure with all rounds pre-populated
function generateWhistData(playerCount, mode = '1-8-1') {
  const cardPattern = generateWhistRoundCards(playerCount, mode);
  return cardPattern.map((cards, index) => ({
    index,
    cards,
    phase: index === 0 ? 'bidding' : 'pending', // First round starts in bidding
    bids: Array(playerCount).fill(null),
    tricks: Array(playerCount).fill(null),
    scores: Array(playerCount).fill(null),
  }));
}

// Calculate Whist score for a player
function calcWhistScore(bid, tricks) {
  if (bid === tricks) {
    return 5 + tricks;
  }
  return -Math.abs(bid - tricks);
}

// Rentz mini-games configuration
const RENTZ_MINI_GAMES = {
  whistPlus: { id: 'whistPlus', name: 'Levate +', icon: 'L+', type: 'tricks', positive: true },
  whistMinus: { id: 'whistMinus', name: 'Levate -', icon: 'L-', type: 'tricks', positive: false },
  diamonds: { id: 'diamonds', name: 'Diamonds', icon: '♦', type: 'cards', positive: false },
  queens: { id: 'queens', name: 'Queens', icon: 'Q', type: 'cards', positive: false, maxCount: 4 },
  kingHearts: { id: 'kingHearts', name: 'King ♥', icon: 'K♥', type: 'single', positive: false },
  tenClubs: { id: 'tenClubs', name: '10 ♣', icon: '10♣', type: 'single', positive: true },
  rentz: { id: 'rentz', name: 'Rentz', icon: 'R', type: 'placement', positive: true },
  totalsPlus: { id: 'totalsPlus', name: 'Totals +', icon: 'Σ+', type: 'totals', positive: true },
  totalsMinus: { id: 'totalsMinus', name: 'Totals -', icon: 'Σ-', type: 'totals', positive: false },
};

// Default scoring values for Rentz
const DEFAULT_RENTZ_CONFIG = {
  whistPoints: 100,          // Points per trick (+ or -)
  diamondPoints: -50,        // Points per diamond card
  queenPoints: -100,         // Points per queen
  kingHeartsPoints: -500,    // Points for taking King of Hearts
  tenClubsPoints: 500,       // Points for taking 10 of Clubs
  rentzPlacement: [500, 300, 100], // Points for 1st, 2nd, 3rd (only top 3 count)
};

// Generate Rentz data structure for all dealers and mini-games
// Rounds alternate between dealers: dealer0-game1, dealer1-game1, dealer2-game1, dealer0-game2, etc.
function generateRentzData(playerCount) {
  const gamesCount = 9; // 9 mini-games per dealer
  const data = [];

  // Interleave rounds: each dealer picks one game, then next dealer, etc.
  for (let gameRound = 0; gameRound < gamesCount; gameRound++) {
    for (let dealerIndex = 0; dealerIndex < playerCount; dealerIndex++) {
      data.push({
        index: data.length,
        dealerIndex,
        dealerRound: gameRound,
        miniGame: null,  // Selected when dealer chooses
        isBlind: false,
        phase: 'pending', // pending | selecting | scoring | complete
        inputs: null,
        scores: Array(playerCount).fill(null),
      });
    }
  }

  // First round starts in selecting phase
  if (data.length > 0) {
    data[0].phase = 'selecting';
  }

  return data;
}

// Calculate scores for a Rentz mini-game
function calcRentzScores(miniGame, inputs, config, playerCount) {
  const scores = Array(playerCount).fill(0);
  const gameInfo = RENTZ_MINI_GAMES[miniGame];

  if (!gameInfo || !inputs) return scores;

  switch (gameInfo.type) {
    case 'tricks':
      // Whist+ or Whist-: points per trick
      const multiplier = gameInfo.positive ? 1 : -1;
      inputs.tricks.forEach((tricks, i) => {
        scores[i] = tricks * config.whistPoints * multiplier;
      });
      break;

    case 'cards':
      // Diamonds or Queens: points per card taken
      const pointsPerCard = miniGame === 'diamonds' ? config.diamondPoints : config.queenPoints;
      inputs.cards.forEach((count, i) => {
        scores[i] = count * pointsPerCard;
      });
      break;

    case 'single':
      // King of Hearts or 10 of Clubs: one player gets points
      const points = miniGame === 'kingHearts' ? config.kingHeartsPoints : config.tenClubsPoints;
      if (inputs.takenBy !== null && inputs.takenBy !== undefined) {
        scores[inputs.takenBy] = points;
      }
      break;

    case 'placement':
      // Rentz domino game: placement points
      if (inputs.placements) {
        inputs.placements.forEach((playerIndex, place) => {
          if (playerIndex !== null && config.rentzPlacement[place] !== undefined) {
            scores[playerIndex] = config.rentzPlacement[place];
          }
        });
      }
      break;

    case 'totals':
      // Totals+ or Totals-: combine tricks, diamonds, queens, K♥, and 10♣
      const isPositive = gameInfo.positive;
      const sign = isPositive ? 1 : -1;

      // Tricks
      if (inputs.tricks) {
        inputs.tricks.forEach((tricks, i) => {
          scores[i] += tricks * config.whistPoints * sign;
        });
      }
      // Diamonds
      if (inputs.diamonds) {
        inputs.diamonds.forEach((count, i) => {
          scores[i] += count * Math.abs(config.diamondPoints) * sign;
        });
      }
      // Queens
      if (inputs.queens) {
        inputs.queens.forEach((count, i) => {
          scores[i] += count * Math.abs(config.queenPoints) * sign;
        });
      }
      // King of Hearts
      if (inputs.kingHeartsTakenBy !== null && inputs.kingHeartsTakenBy !== undefined) {
        scores[inputs.kingHeartsTakenBy] += Math.abs(config.kingHeartsPoints) * sign;
      }
      // 10 of Clubs (only for Totals+)
      if (isPositive && inputs.tenClubsTakenBy !== null && inputs.tenClubsTakenBy !== undefined) {
        scores[inputs.tenClubsTakenBy] += config.tenClubsPoints;
      }
      break;
  }

  return scores;
}

const GAME_CONFIG = {
  septica: {
    name: "Septica",
    minPlayers: 4,
    maxPlayers: 4,
    isTeamGame: true,
    teamCount: 2,
    maxRoundPoints: 8,
    shutoutPoints: 16, // When one team scores 0
  },
  whist: {
    name: "Whist",
    minPlayers: 3,
    maxPlayers: 6,
  },
  rentz: { name: "Rentz", minPlayers: 3, maxPlayers: 6 },
  general: {
    name: "General",
    minPlayers: 2,
    maxPlayers: 8,
  },
};

function loadFromStorage(gameType) {
  if (typeof window === "undefined" || !gameType) return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + gameType);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(gameType, data) {
  if (typeof window === "undefined" || !gameType) return;
  try {
    if (data === null) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + gameType);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + gameType, JSON.stringify(data));
    }
  } catch {
    // Ignore storage errors
  }
}

export function useScoreTracker(initialGameType = null) {
  const [gameType, setGameType] = useState(initialGameType);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]); // For team games like Septica: [["P1", "P3"], ["P2", "P4"]]
  const [rounds, setRounds] = useState([]); // For Septica/Rentz
  const [whistData, setWhistData] = useState([]); // For Whist: pre-populated rounds with phases
  const [whistMode, setWhistMode] = useState('1-8-1'); // Whist round pattern: '1-8-1' or '8-1-8'
  const [rentzConfig, setRentzConfig] = useState(DEFAULT_RENTZ_CONFIG); // Rentz scoring config
  const [rentzData, setRentzData] = useState([]); // For Rentz: dealers and mini-games
  // General tracker state
  const [generalData, setGeneralData] = useState([]); // Array of rounds: [{scores: [p1, p2, ...], complete: bool}]
  const [generalCurrentPlayer, setGeneralCurrentPlayer] = useState(0); // Index of current player within current round
  const [phase, setPhase] = useState(initialGameType ? "setup" : "select");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const typeToLoad = initialGameType || gameType;
    if (!typeToLoad) {
      setIsLoaded(true);
      return;
    }

    const stored = loadFromStorage(typeToLoad);
    if (stored) {
      setPlayers(stored.players || []);
      setTeams(stored.teams || []);
      setRounds(stored.rounds || []);
      setWhistData(stored.whistData || []);
      setWhistMode(stored.whistMode || '1-8-1');
      setRentzConfig(stored.rentzConfig || DEFAULT_RENTZ_CONFIG);
      setRentzData(stored.rentzData || []);
      setGeneralData(stored.generalData || []);
      setGeneralCurrentPlayer(stored.generalCurrentPlayer || 0);
      if (stored.players?.length > 0 || stored.teams?.length > 0) {
        setPhase("playing");
      }
    }
    setIsLoaded(true);
  }, [initialGameType]);

  // Save to localStorage whenever game state changes
  useEffect(() => {
    if (!isLoaded) return;
    const typeToSave = initialGameType || gameType;
    if (!typeToSave) return;

    if (players.length > 0 || teams.length > 0) {
      saveToStorage(typeToSave, {
        players,
        teams,
        rounds,
        whistData,
        whistMode,
        rentzConfig,
        rentzData,
        generalData,
        generalCurrentPlayer,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [isLoaded, initialGameType, gameType, players, teams, rounds, whistData, whistMode, rentzConfig, rentzData, generalData, generalCurrentPlayer]);

  const selectGame = useCallback((type) => {
    setGameType(type);
    setPhase("setup");
  }, []);

  const startGame = useCallback((playerNames, gameTypeOverride = null, customConfig = null) => {
    const type = gameTypeOverride || gameType;

    setPlayers(playerNames);
    setTeams([]);
    setRounds([]);

    // Generate whistData for Whist
    if (type === "whist") {
      const mode = customConfig?.whistMode || '1-8-1';
      setWhistMode(mode);
      setWhistData(generateWhistData(playerNames.length, mode));
    } else {
      setWhistData([]);
    }

    // Generate rentzData for Rentz
    if (type === "rentz") {
      if (customConfig) {
        setRentzConfig(customConfig);
      }
      setRentzData(generateRentzData(playerNames.length));
    } else {
      setRentzData([]);
    }

    // Initialize general tracker
    if (type === "general") {
      setGeneralData([]);
      setGeneralCurrentPlayer(0);
    } else {
      setGeneralData([]);
      setGeneralCurrentPlayer(0);
    }

    setPhase("playing");
  }, [gameType]);

  const startTeamGame = useCallback((teamNames) => {
    // teamNames: [["Team1Name", "P1", "P2"], ["Team2Name", "P3", "P4"]]
    setTeams(teamNames);
    setPlayers([]);
    setRounds([]);
    setPhase("playing");
  }, []);

  const addRound = useCallback((scores, roundData = null) => {
    setRounds((prev) => [
      ...prev,
      { id: Date.now(), scores, ...(roundData && { data: roundData }) },
    ]);
  }, []);

  const updateRound = useCallback((roundId, scores, roundData = null) => {
    setRounds((prev) =>
      prev.map((r) => (r.id === roundId ? { ...r, scores, ...(roundData && { data: roundData }) } : r))
    );
  }, []);

  const deleteRound = useCallback((roundId) => {
    setRounds((prev) => prev.filter((r) => r.id !== roundId));
  }, []);

  // Whist: Update bids for a round and move to tricks phase
  const updateWhistBids = useCallback((roundIndex, bids) => {
    setWhistData((prev) => {
      const next = [...prev];
      next[roundIndex] = {
        ...next[roundIndex],
        bids,
        phase: 'tricks',
      };
      return next;
    });
  }, []);

  // Whist: Update tricks for a round, calculate scores, and move to complete
  const updateWhistTricks = useCallback((roundIndex, tricks, newBids = null) => {
    setWhistData((prev) => {
      const next = [...prev];
      const round = next[roundIndex];
      const bids = newBids || round.bids;
      const scores = bids.map((bid, i) => calcWhistScore(bid, tricks[i]));

      next[roundIndex] = {
        ...round,
        bids,
        tricks,
        scores,
        phase: 'complete',
      };

      // Activate next round if exists (only if not already complete)
      if (round.phase !== 'complete' && roundIndex + 1 < next.length) {
        next[roundIndex + 1] = {
          ...next[roundIndex + 1],
          phase: 'bidding',
        };
      }

      return next;
    });
  }, []);

  // Whist: Go back from tricks to bidding phase
  const revertWhistToBidding = useCallback((roundIndex) => {
    setWhistData((prev) => {
      const next = [...prev];
      next[roundIndex] = {
        ...next[roundIndex],
        tricks: Array(players.length).fill(null),
        scores: Array(players.length).fill(null),
        phase: 'bidding',
      };
      return next;
    });
  }, [players.length]);

  // Rentz: Select a mini-game for the current round
  const selectRentzMiniGame = useCallback((roundIndex, miniGame, isBlind = false) => {
    setRentzData((prev) => {
      const next = [...prev];
      next[roundIndex] = {
        ...next[roundIndex],
        miniGame,
        isBlind,
        phase: 'scoring',
      };
      return next;
    });
  }, []);

  // Rentz: Update scores for a round and move to complete
  const updateRentzScores = useCallback((roundIndex, inputs) => {
    setRentzData((prev) => {
      const next = [...prev];
      const round = next[roundIndex];
      const scores = calcRentzScores(round.miniGame, inputs, rentzConfig, players.length);

      // Apply blind multiplier if applicable
      const finalScores = round.isBlind
        ? scores.map(s => s * 2)
        : scores;

      next[roundIndex] = {
        ...round,
        inputs,
        scores: finalScores,
        phase: 'complete',
      };

      // Activate next round if exists
      if (roundIndex + 1 < next.length) {
        next[roundIndex + 1] = {
          ...next[roundIndex + 1],
          phase: 'selecting',
        };
      }

      return next;
    });
  }, [rentzConfig, players.length]);

  // Rentz: Go back to mini-game selection
  const revertRentzToSelecting = useCallback((roundIndex) => {
    setRentzData((prev) => {
      const next = [...prev];
      next[roundIndex] = {
        ...next[roundIndex],
        miniGame: null,
        isBlind: false,
        inputs: null,
        scores: Array(players.length).fill(null),
        phase: 'selecting',
      };
      return next;
    });
  }, [players.length]);

  // Rentz: Get remaining (unplayed) mini-games for a dealer
  const getRentzRemainingGames = useCallback((dealerIndex) => {
    const playedGames = rentzData
      .filter(r => r.dealerIndex === dealerIndex && r.phase === 'complete' && r.miniGame)
      .map(r => r.miniGame);

    return Object.keys(RENTZ_MINI_GAMES).filter(game => !playedGames.includes(game));
  }, [rentzData]);

  // General: Add a score for the current player
  const addGeneralScore = useCallback((score) => {
    setGeneralData((prev) => {
      const playerCount = players.length;
      if (playerCount === 0) return prev;

      const newData = [...prev];
      const currentRoundIndex = newData.length > 0 && !newData[newData.length - 1].complete
        ? newData.length - 1
        : -1;

      if (currentRoundIndex === -1) {
        // Start new round
        const newRound = {
          id: Date.now(),
          scores: Array(playerCount).fill(null),
          complete: false,
        };
        newRound.scores[0] = score;
        newData.push(newRound);
        setGeneralCurrentPlayer(playerCount > 1 ? 1 : 0);
      } else {
        // Add to current round
        const round = { ...newData[currentRoundIndex] };
        round.scores = [...round.scores];

        // Find next empty slot
        const nextEmptyIndex = round.scores.findIndex(s => s === null);
        if (nextEmptyIndex !== -1) {
          round.scores[nextEmptyIndex] = score;

          // Check if round is complete
          const nextEmpty = round.scores.findIndex(s => s === null);
          if (nextEmpty === -1) {
            round.complete = true;
            setGeneralCurrentPlayer(0);
          } else {
            setGeneralCurrentPlayer(nextEmpty);
          }
          newData[currentRoundIndex] = round;
        }
      }

      return newData;
    });
  }, [players.length]);

  // General: Undo last score entry
  const undoGeneralScore = useCallback(() => {
    setGeneralData((prev) => {
      if (prev.length === 0) return prev;

      const newData = [...prev];
      const lastRoundIndex = newData.length - 1;
      const lastRound = { ...newData[lastRoundIndex] };
      lastRound.scores = [...lastRound.scores];

      if (lastRound.complete) {
        // Uncomplete the round and remove last score
        lastRound.complete = false;
        const lastFilledIndex = lastRound.scores.length - 1;
        lastRound.scores[lastFilledIndex] = null;
        setGeneralCurrentPlayer(lastFilledIndex);
        newData[lastRoundIndex] = lastRound;
      } else {
        // Find last filled score and remove it
        let lastFilledIndex = -1;
        for (let i = lastRound.scores.length - 1; i >= 0; i--) {
          if (lastRound.scores[i] !== null) {
            lastFilledIndex = i;
            break;
          }
        }

        if (lastFilledIndex === 0) {
          // Remove the entire round if only first score was entered
          newData.pop();
          if (newData.length > 0 && newData[newData.length - 1].complete) {
            // Previous round is complete, next score starts new round
            setGeneralCurrentPlayer(0);
          } else if (newData.length > 0) {
            // Previous round is incomplete, find its next empty slot
            const prevRound = newData[newData.length - 1];
            const nextEmpty = prevRound.scores.findIndex(s => s === null);
            setGeneralCurrentPlayer(nextEmpty === -1 ? 0 : nextEmpty);
          } else {
            setGeneralCurrentPlayer(0);
          }
        } else if (lastFilledIndex > 0) {
          lastRound.scores[lastFilledIndex] = null;
          setGeneralCurrentPlayer(lastFilledIndex);
          newData[lastRoundIndex] = lastRound;
        }
      }

      return newData;
    });
  }, []);

  // General: Edit a specific score
  const editGeneralScore = useCallback((roundIndex, playerIndex, newScore) => {
    setGeneralData((prev) => {
      if (roundIndex >= prev.length) return prev;
      const newData = [...prev];
      const round = { ...newData[roundIndex] };
      round.scores = [...round.scores];
      round.scores[playerIndex] = newScore;
      newData[roundIndex] = round;
      return newData;
    });
  }, []);

  // General: Delete a round
  const deleteGeneralRound = useCallback((roundIndex) => {
    setGeneralData((prev) => {
      const newData = prev.filter((_, i) => i !== roundIndex);
      // Recalculate current player if needed
      if (newData.length === 0) {
        setGeneralCurrentPlayer(0);
      } else if (!newData[newData.length - 1].complete) {
        const lastRound = newData[newData.length - 1];
        const nextEmpty = lastRound.scores.findIndex(s => s === null);
        setGeneralCurrentPlayer(nextEmpty === -1 ? 0 : nextEmpty);
      } else {
        setGeneralCurrentPlayer(0);
      }
      return newData;
    });
  }, []);

  const newGame = useCallback(() => {
    const typeToRemove = initialGameType || gameType;
    setPlayers([]);
    setTeams([]);
    setRounds([]);
    setWhistData([]);
    setWhistMode('1-8-1');
    setRentzData([]);
    setRentzConfig(DEFAULT_RENTZ_CONFIG);
    setGeneralData([]);
    setGeneralCurrentPlayer(0);
    setPhase("setup");
    if (typeToRemove) {
      saveToStorage(typeToRemove, null);
    }
  }, [initialGameType, gameType]);

  const goBack = useCallback(() => {
    if (phase === "setup") {
      setGameType(null);
      setPhase("select");
    } else if (phase === "playing" && rounds.length === 0) {
      setPlayers([]);
      setPhase("setup");
    }
  }, [phase, rounds.length]);

  const config = gameType ? GAME_CONFIG[gameType] : null;
  const isTeamGame = config?.isTeamGame || false;

  // Computed values - handle both team and individual games
  const totals = isTeamGame
    ? teams.map((_, teamIndex) =>
        rounds.reduce((sum, round) => sum + (round.scores[teamIndex] || 0), 0)
      )
    : players.map((_, playerIndex) =>
        rounds.reduce((sum, round) => sum + (round.scores[playerIndex] || 0), 0)
      );

  const leaderIndex = totals.length > 0
    ? totals.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0)
    : -1;

  // Whist-specific computed values
  const whistTotals = players.map((_, playerIndex) =>
    whistData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );
  const whistActiveRoundIndex = whistData.findIndex(r => r.phase === 'bidding' || r.phase === 'tricks');
  const whistIsComplete = whistData.length > 0 && whistData.every(r => r.phase === 'complete');

  // Rentz-specific computed values
  const rentzTotals = players.map((_, playerIndex) =>
    rentzData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );
  const rentzActiveRoundIndex = rentzData.findIndex(r => r.phase === 'selecting' || r.phase === 'scoring');
  const rentzIsComplete = rentzData.length > 0 && rentzData.every(r => r.phase === 'complete');
  const rentzCurrentDealerIndex = rentzActiveRoundIndex >= 0 ? rentzData[rentzActiveRoundIndex]?.dealerIndex : -1;

  // Get games played by each dealer (for grid display)
  const rentzDealerGames = players.map((_, dealerIndex) => {
    const dealerRounds = rentzData.filter(r => r.dealerIndex === dealerIndex);
    return dealerRounds.reduce((acc, round) => {
      if (round.miniGame && round.phase === 'complete') {
        acc[round.miniGame] = true;
      }
      return acc;
    }, {});
  });

  // General-specific computed values
  const generalTotals = players.map((_, playerIndex) =>
    generalData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );
  const generalLeaderIndex = generalTotals.length > 0
    ? generalTotals.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0)
    : -1;
  // Check if there are any scores to determine if we can undo
  const generalCanUndo = generalData.length > 0 && (
    !generalData[generalData.length - 1].complete ||
    generalData[generalData.length - 1].scores.some(s => s !== null)
  );

  return {
    // State
    gameType,
    players,
    teams,
    rounds,
    whistData,
    whistMode,
    rentzConfig,
    rentzData,
    generalData,
    generalCurrentPlayer,
    phase,
    isLoaded,
    config,

    // Computed
    totals,
    leaderIndex,
    isTeamGame,

    // Whist-specific computed
    whistTotals,
    whistActiveRoundIndex,
    whistIsComplete,

    // Rentz-specific computed
    rentzTotals,
    rentzActiveRoundIndex,
    rentzIsComplete,
    rentzCurrentDealerIndex,
    rentzDealerGames,

    // General-specific computed
    generalTotals,
    generalLeaderIndex,
    generalCanUndo,

    // Actions
    selectGame,
    startGame,
    startTeamGame,
    addRound,
    updateRound,
    deleteRound,
    updateWhistBids,
    updateWhistTricks,
    revertWhistToBidding,
    selectRentzMiniGame,
    updateRentzScores,
    revertRentzToSelecting,
    getRentzRemainingGames,
    addGeneralScore,
    undoGeneralScore,
    editGeneralScore,
    deleteGeneralRound,
    newGame,
    goBack,

    // Constants
    GAME_CONFIG,
    RENTZ_MINI_GAMES,
    DEFAULT_RENTZ_CONFIG,
  };
}
