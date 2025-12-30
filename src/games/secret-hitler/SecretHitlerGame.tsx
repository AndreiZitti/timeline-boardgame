"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";

// Import styles (base.css includes Google Fonts)
import "./styles/base.css";
import "./styles/theme-original.css";
import "./styles/theme-voldemort.css";

// Import screens
import { HomeScreen, CreateRoomScreen, JoinRoomScreen, ArtStyle } from "./screens";

// Import theme context
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeId, getThemeLabels } from "./assets/themes";

// Import server constants from existing constants file
import { SERVER_ADDRESS_HTTP, NEW_LOBBY, CHECK_LOGIN } from "./constants";

// Import bot manager
import { BotManager, disconnectBots } from "./BotManager";

interface SecretHitlerGameProps {
  onBack: () => void;
}

// Dynamically import App with SSR disabled since it uses window.location
const GameApp = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div className="secret-hitler-screen loading-screen">
      <p>Connecting to game...</p>
    </div>
  ),
});

type Screen = "home" | "create" | "join" | "game";

const COOKIE_NAME = "sh_name";
const COOKIE_LOBBY = "sh_lobby";

export function SecretHitlerGame({ onBack }: SecretHitlerGameProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [initialCode, setInitialCode] = useState("");
  const [isCheckingRejoin, setIsCheckingRejoin] = useState(true);

  // Bot manager reference
  const botManagerRef = useRef<BotManager | null>(null);

  // Game session data (passed to App when entering game)
  const [gameSession, setGameSession] = useState<{
    name: string;
    lobby: string;
    artStyle: ThemeId;
  } | null>(null);

  // Load saved data from cookies/URL on mount and attempt auto-rejoin
  useEffect(() => {
    const attemptAutoRejoin = async () => {
      // Load saved name from cookie
      const name = Cookies.get(COOKIE_NAME);
      const lobby = Cookies.get(COOKIE_LOBBY);

      if (name) {
        setSavedName(name);
      }

      // Check URL for lobby code (takes priority over saved lobby)
      const urlParams = new URLSearchParams(window.location.search);
      const lobbyFromUrl = urlParams.get("lobby");

      if (lobbyFromUrl) {
        setInitialCode(lobbyFromUrl.toUpperCase().slice(0, 4));
        setScreen("join");
        setIsCheckingRejoin(false);
        return;
      }

      // If we have both name and lobby saved, try to auto-rejoin
      if (name && lobby) {
        try {
          const response = await fetch(
            `${SERVER_ADDRESS_HTTP}${CHECK_LOGIN}?name=${encodeURIComponent(name)}&lobby=${encodeURIComponent(lobby)}`
          );

          if (response.ok) {
            // Can rejoin! Start game session automatically
            console.log(`[SecretHitlerGame] Auto-rejoining lobby ${lobby} as ${name}`);
            setGameSession({ name, lobby, artStyle: "original" });
            setScreen("game");
            setIsCheckingRejoin(false);
            return;
          } else {
            // Lobby doesn't exist or can't rejoin - clear the saved lobby
            console.log(`[SecretHitlerGame] Cannot rejoin lobby ${lobby}: ${response.status}`);
            Cookies.remove(COOKIE_LOBBY);
          }
        } catch (err) {
          console.log("[SecretHitlerGame] Failed to check for auto-rejoin:", err);
        }
      }

      setIsCheckingRejoin(false);
    };

    attemptAutoRejoin();
  }, []);

  // Create a new lobby
  const handleCreateRoom = async (name: string, artStyle: ArtStyle, fillWithBots: boolean, botCount: number) => {
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

        // Add bots if requested
        if (fillWithBots && botCount > 0) {
          // Small delay to let the human player connect first
          setTimeout(async () => {
            try {
              // Disconnect any existing bots
              if (botManagerRef.current) {
                botManagerRef.current.disconnect();
              }

              // Create new bot manager and add bots
              botManagerRef.current = new BotManager();
              await botManagerRef.current.addBots(lobbyCode, name, botCount);
              console.log(`[SecretHitlerGame] Added ${botCount} bots to lobby ${lobbyCode}`);
            } catch (botErr) {
              console.error("[SecretHitlerGame] Failed to add bots:", botErr);
            }
          }, 1500);
        }
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
    console.log("[SecretHitlerGame] handleLeaveGame called");
    // Disconnect bots when leaving
    if (botManagerRef.current) {
      botManagerRef.current.disconnect();
      botManagerRef.current = null;
    }
    // Clear lobby cookie so we don't auto-rejoin a lobby we left intentionally
    Cookies.remove(COOKIE_LOBBY);
    console.log("[SecretHitlerGame] Setting gameSession to null and screen to home");
    setGameSession(null);
    setScreen("home");
    setError("");
  };

  // Handle theme received from server (for joining players)
  const handleThemeReceived = (theme: ThemeId) => {
    if (gameSession && theme !== gameSession.artStyle) {
      console.log(`[SecretHitlerGame] Theme updated from server: ${theme}`);
      setGameSession(prev => prev ? { ...prev, artStyle: theme } : null);
    }
  };

  // Show loading screen while checking for auto-rejoin
  if (isCheckingRejoin) {
    return (
      <div className="secret-hitler-screen loading-screen">
        <p>Checking session...</p>
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
          themeLabels={getThemeLabels("original")}
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
        <ThemeProvider themeId={gameSession.artStyle}>
          <div className={`secret-hitler-game-container theme-${gameSession.artStyle}`}>
            <GameApp
              key={gameSession.lobby} // Force remount when lobby changes
              onBack={handleLeaveGame}
              initialName={gameSession.name}
              initialLobby={gameSession.lobby}
              themeId={gameSession.artStyle}
              onThemeReceived={handleThemeReceived}
            />
          </div>
        </ThemeProvider>
      );

    default:
      return null;
  }
}

export default SecretHitlerGame;
