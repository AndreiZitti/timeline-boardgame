"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";

// Import styles
import "./styles/base.css";
import "./styles/theme-original.css";
import "./styles/theme-voldemort.css";
import "./fonts.css";

// Import screens
import { HomeScreen, CreateRoomScreen, JoinRoomScreen, ArtStyle } from "./screens";

// Import server constants from existing constants file
import { SERVER_ADDRESS_HTTP, NEW_LOBBY, CHECK_LOGIN } from "./constants";

interface SecretHitlerGameProps {
  onBack: () => void;
}

// Dynamically import App with SSR disabled since it uses window.location
const GameApp = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div className="secret-hitler-screen">
      <p>Loading game...</p>
    </div>
  ),
});

type Screen = "home" | "create" | "join" | "game";

const COOKIE_NAME = "sh_name";
const COOKIE_LOBBY = "sh_lobby";

export function SecretHitlerGame({ onBack }: SecretHitlerGameProps) {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [initialCode, setInitialCode] = useState("");

  // Game session data (passed to App when entering game)
  const [gameSession, setGameSession] = useState<{
    name: string;
    lobby: string;
    artStyle: ArtStyle;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Load saved name from cookie
    const name = Cookies.get(COOKIE_NAME);
    if (name) {
      setSavedName(name);
    }

    // Check URL for lobby code
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyFromUrl = urlParams.get("lobby");
    if (lobbyFromUrl) {
      setInitialCode(lobbyFromUrl.toUpperCase().slice(0, 4));
      setScreen("join");
    }
  }, []);

  // Create a new lobby
  const handleCreateRoom = async (name: string, artStyle: ArtStyle) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(SERVER_ADDRESS_HTTP + NEW_LOBBY);
      if (response.ok) {
        const lobbyCode = await response.text();

        // Save to cookies
        Cookies.set(COOKIE_NAME, name, { expires: 7 });
        Cookies.set(COOKIE_LOBBY, lobbyCode);

        // Start game session
        setGameSession({ name, lobby: lobbyCode, artStyle });
        setScreen("game");
      } else {
        setError("Failed to create room. Please try again.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Join an existing lobby
  const handleJoinRoom = async (code: string, name: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${SERVER_ADDRESS_HTTP}${CHECK_LOGIN}?name=${encodeURIComponent(name)}&lobby=${encodeURIComponent(code)}`
      );

      if (response.ok) {
        // Save to cookies
        Cookies.set(COOKIE_NAME, name, { expires: 7 });
        Cookies.set(COOKIE_LOBBY, code);

        // Start game session (default to original art style for joining)
        setGameSession({ name, lobby: code, artStyle: "original" });
        setScreen("game");
      } else if (response.status === 404) {
        setError("Room not found. Check the code and try again.");
      } else if (response.status === 403) {
        setError(`The name "${name}" is already taken in this room.`);
      } else if (response.status === 488) {
        setError("This room is currently in a game.");
      } else if (response.status === 489) {
        setError("This room is full.");
      } else {
        setError("Could not join room. Please try again.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle leaving the game and returning to home
  const handleLeaveGame = () => {
    setGameSession(null);
    setScreen("home");
    setError("");
  };

  if (!mounted) {
    return (
      <div className="secret-hitler-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Render based on current screen
  switch (screen) {
    case "home":
      return (
        <HomeScreen
          onBack={onBack}
          onCreateRoom={() => setScreen("create")}
          onJoinRoom={() => setScreen("join")}
        />
      );

    case "create":
      return (
        <CreateRoomScreen
          onBack={() => {
            setScreen("home");
            setError("");
          }}
          onCreateRoom={handleCreateRoom}
          loading={loading}
          error={error}
          savedName={savedName}
        />
      );

    case "join":
      return (
        <JoinRoomScreen
          onBack={() => {
            setScreen("home");
            setError("");
            setInitialCode("");
          }}
          onJoinRoom={handleJoinRoom}
          loading={loading}
          error={error}
          savedName={savedName}
          initialCode={initialCode}
        />
      );

    case "game":
      if (!gameSession) {
        setScreen("home");
        return null;
      }

      return (
        <div className={`secret-hitler-game-container theme-${gameSession.artStyle}`}>
          <GameApp
            onBack={handleLeaveGame}
            initialName={gameSession.name}
            initialLobby={gameSession.lobby}
          />
        </div>
      );

    default:
      return null;
  }
}

export default SecretHitlerGame;
