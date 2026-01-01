"use client";

import { useRouter } from "next/navigation";
import { GameSelect } from "@/games/score-tracker/components/GameSelect";
import "@/games/score-tracker/score-tracker.css";

const GAME_CONFIG = {
  septica: {
    name: "Septica",
    minPlayers: 4,
    maxPlayers: 4,
    isTeamGame: true,
    teamCount: 2,
  },
  whist: {
    name: "Whist",
    minPlayers: 3,
    maxPlayers: 6,
  },
  rentz: {
    name: "Rentz",
    minPlayers: 3,
    maxPlayers: 5
  },
  general: {
    name: "General",
    minPlayers: 2,
    maxPlayers: 8,
  },
};

export default function ScoreTrackerPage() {
  const router = useRouter();

  const handleSelect = (gameType: string) => {
    router.push(`/score-tracker/${gameType}`);
  };

  return (
    <div className="screen score-tracker">
      <button className="btn-back" onClick={() => router.push("/")}>
        &larr; Home
      </button>
      <h1 className="score-tracker-title">Score Tracker</h1>
      <p className="subtitle">Track scores for card games</p>
      <GameSelect onSelect={handleSelect} GAME_CONFIG={GAME_CONFIG} />
    </div>
  );
}
