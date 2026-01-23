"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

interface Item {
  id: string;
  name: string;
  description: string;
  available: boolean;
  accent: string;
  href: string;
}

const games: Item[] = [
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
    id: "quirtle",
    name: "Quirtle",
    description: "Match colors and shapes in this tile-laying strategy game.",
    available: true,
    accent: "#10b981",
    href: "/games/quirtle",
  },
  {
    id: "secret-hitler",
    name: "Secret Hitler",
    description: "A social deduction game of political intrigue.",
    available: true,
    accent: "#dc2626",
    href: "/games/secret-hitler",
  },
  {
    id: "codenames",
    name: "Codenames",
    description: "Give clues, find your agents, avoid the assassin!",
    available: true,
    accent: "#2563eb",
    href: "/games/codenames",
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "Race to answer trivia! Fastest correct wins the most points.",
    available: true,
    accent: "#eab308",
    href: "/games/quiz",
  },
];

const tools: Item[] = [
  {
    id: "score-tracker",
    name: "Score Tracker",
    description: "Track scores for Septica, Whist, and Rentz.",
    available: true,
    accent: "#f59e0b",
    href: "/score-tracker",
  },
];

interface GameHubProps {
  onOpenProfile: () => void;
}

export function GameHub({ onOpenProfile }: GameHubProps) {
  const { profile } = useUser();
  const playerName = profile.name;
  const [activeTab, setActiveTab] = useState<"games" | "tools">("games");

  const items = activeTab === "games" ? games : tools;
  const title = activeTab === "games" ? "Party Games" : "Tools";
  const subtitle = activeTab === "games"
    ? "Choose a game to play with friends"
    : "Utilities for your game nights";

  return (
    <div className="screen game-hub">
      <div className="hub-header">
        <div className="hub-profile">
          <button className="profile-button" onClick={onOpenProfile}>
            {playerName ? playerName.charAt(0).toUpperCase() : "?"}
          </button>
          <span className="hub-player-name">{playerName || "Guest"}</span>
        </div>
        <a href="https://zitti.ro" className="hub-back-link">
          &larr; zitti.ro
        </a>
      </div>

      <div className="hub-content">
        <h1 className="hub-title">{title}</h1>
        <p className="hub-subtitle">{subtitle}</p>

        <div className="games-list">
          {items.map((item) =>
            item.available ? (
              <Link
                key={item.id}
                href={item.href}
                className="game-card"
                style={{ "--game-accent": item.accent } as React.CSSProperties}
              >
                <div className="game-card-content">
                  <h2 className="game-name">{item.name}</h2>
                  <p className="game-description">{item.description}</p>
                </div>
                <span className="game-arrow">&rarr;</span>
              </Link>
            ) : (
              <div
                key={item.id}
                className="game-card coming-soon"
                style={{ "--game-accent": item.accent } as React.CSSProperties}
              >
                <div className="game-card-content">
                  <h2 className="game-name">{item.name}</h2>
                  <p className="game-description">{item.description}</p>
                  <span className="coming-soon-badge">Coming Soon</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="hub-tab-bar">
        <button
          className={`hub-tab ${activeTab === "games" ? "active" : ""}`}
          onClick={() => setActiveTab("games")}
        >
          <span className="hub-tab-icon">🎮</span>
          <span className="hub-tab-label">Games</span>
        </button>
        <button
          className={`hub-tab ${activeTab === "tools" ? "active" : ""}`}
          onClick={() => setActiveTab("tools")}
        >
          <span className="hub-tab-icon">🛠</span>
          <span className="hub-tab-label">Tools</span>
        </button>
      </div>
    </div>
  );
}
