"use client";

import { useRouter } from "next/navigation";
import { useScoreTracker } from "../hooks/useScoreTracker";
import { PlayerSetup } from "./PlayerSetup";
import { ScoreTable } from "./ScoreTable";
import "../score-tracker.css";

export function GamePage({ gameType }) {
  const router = useRouter();
  const {
    players,
    teams,
    rounds,
    whistData,
    phase,
    isLoaded,
    config,
    totals,
    leaderIndex,
    isTeamGame,
    whistTotals,
    whistActiveRoundIndex,
    whistIsComplete,
    // Rentz-specific
    rentzData,
    rentzConfig,
    rentzTotals,
    rentzActiveRoundIndex,
    rentzIsComplete,
    rentzCurrentDealerIndex,
    rentzDealerGames,
    // General-specific
    generalData,
    generalCurrentPlayer,
    generalTotals,
    generalLeaderIndex,
    generalCanUndo,
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
    addGeneralScore,
    undoGeneralScore,
    editGeneralScore,
    deleteGeneralRound,
    newGame,
    GAME_CONFIG,
    RENTZ_MINI_GAMES,
    DEFAULT_RENTZ_CONFIG,
  } = useScoreTracker(gameType);

  const gameConfig = GAME_CONFIG[gameType];

  if (!isLoaded) {
    return (
      <div className="screen score-tracker">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Reset clears storage and goes back to setup for this game
  const handleReset = () => {
    newGame();
  };

  // Show setup if no players/teams yet
  const needsSetup = phase === "setup" || (phase === "select") ||
    (gameConfig?.isTeamGame ? teams.length === 0 : players.length === 0);

  // Handler for Rentz start with custom config
  const handleStartRentz = (playerNames, customRentzConfig) => {
    startGame(playerNames, gameType, customRentzConfig);
  };

  return (
    <div className={`screen score-tracker ${!needsSetup ? 'score-tracker-playing' : ''}`}>
      {needsSetup ? (
        <>
          <button className="btn-back" onClick={() => router.push("/score-tracker")}>
            &larr; Score Tracker
          </button>
          <PlayerSetup
            config={gameConfig}
            onStart={(playerNames) => startGame(playerNames, gameType)}
            onStartTeamGame={startTeamGame}
            onStartRentz={handleStartRentz}
            defaultRentzConfig={DEFAULT_RENTZ_CONFIG}
          />
        </>
      ) : (
        <ScoreTable
          gameType={gameType}
          players={players}
          teams={teams}
          rounds={rounds}
          totals={totals}
          leaderIndex={leaderIndex}
          config={gameConfig}
          isTeamGame={isTeamGame}
          whistData={whistData}
          whistTotals={whistTotals}
          whistActiveRoundIndex={whistActiveRoundIndex}
          whistIsComplete={whistIsComplete}
          rentzData={rentzData}
          rentzConfig={rentzConfig}
          rentzTotals={rentzTotals}
          rentzActiveRoundIndex={rentzActiveRoundIndex}
          rentzIsComplete={rentzIsComplete}
          rentzCurrentDealerIndex={rentzCurrentDealerIndex}
          rentzDealerGames={rentzDealerGames}
          rentzMiniGames={RENTZ_MINI_GAMES}
          generalData={generalData}
          generalCurrentPlayer={generalCurrentPlayer}
          generalTotals={generalTotals}
          generalLeaderIndex={generalLeaderIndex}
          generalCanUndo={generalCanUndo}
          onAddRound={addRound}
          onUpdateRound={updateRound}
          onDeleteRound={deleteRound}
          onUpdateWhistBids={updateWhistBids}
          onUpdateWhistTricks={updateWhistTricks}
          onRevertWhistToBidding={revertWhistToBidding}
          onSelectRentzMiniGame={selectRentzMiniGame}
          onUpdateRentzScores={updateRentzScores}
          onRevertRentzToSelecting={revertRentzToSelecting}
          onAddGeneralScore={addGeneralScore}
          onUndoGeneralScore={undoGeneralScore}
          onEditGeneralScore={editGeneralScore}
          onDeleteGeneralRound={deleteGeneralRound}
          onReset={handleReset}
          onBackToMenu={() => router.push("/score-tracker")}
        />
      )}
    </div>
  );
}
