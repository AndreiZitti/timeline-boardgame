"use client";

import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

interface Game {
  id: string;
  name: string;
  description: string;
  available: boolean;
  accent: string;
  href: string;
}

const games: Game[] = [
  {
    id: "hot-take",
    name: "Hot Take",
    description: "Where do you stand? Rank yourselves 1-100 on spicy topics.",
    available: true,
    accent: "#a855f7",
    href: "/games/hot-take",
  },
  {
    id: "like-minded",
    name: "Like Minded",
    description: "Give clues. Find the wavelength. Beat the game!",
    available: true,
    accent: "#06b6d4",
    href: "/games/like-minded",
  },
  {
    id: "secret-hitler",
    name: "Secret Hitler",
    description: "A social deduction game of political intrigue.",
    available: false,
    accent: "#dc2626",
    href: "/games/secret-hitler",
  },
];

interface GameHubProps {
  onOpenProfile: () => void;
}

export function GameHub({ onOpenProfile }: GameHubProps) {
  const { profile } = useUser();
  const playerName = profile.name;

  return (
    <div className="screen game-hub">
      <div className="hub-header">
        <div className="hub-profile">
          <button className="profile-button" onClick={onOpenProfile}>
            {playerName ? playerName.charAt(0).toUpperCase() : "?"}
          </button>
          <span className="hub-player-name">{playerName || "Guest"}</span>
        </div>
      </div>

      <div className="hub-content">
        <h1 className="hub-title">Party Games</h1>
        <p className="hub-subtitle">Choose a game to play with friends</p>

        <div className="games-list">
          {games.map((game) =>
            game.available ? (
              <Link
                key={game.id}
                href={game.href}
                className="game-card"
                style={{ "--game-accent": game.accent } as React.CSSProperties}
              >
                <div className="game-card-content">
                  <h2 className="game-name">{game.name}</h2>
                  <p className="game-description">{game.description}</p>
                </div>
                <span className="game-arrow">&rarr;</span>
              </Link>
            ) : (
              <div
                key={game.id}
                className="game-card coming-soon"
                style={{ "--game-accent": game.accent } as React.CSSProperties}
              >
                <div className="game-card-content">
                  <h2 className="game-name">{game.name}</h2>
                  <p className="game-description">{game.description}</p>
                  <span className="coming-soon-badge">Coming Soon</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
