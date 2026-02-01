"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, supabaseGames } from "@/lib/supabase/client";
import { ScoreTable } from "@/games/score-tracker/components/ScoreTable";
import "@/games/score-tracker/score-tracker.css";

interface RoomData {
  code: string;
  game_type: string;
  players: string[];
  game_config: {
    whistMode?: string;
  };
  game_state: WhistRound[];
}

interface WhistRound {
  index: number;
  cards: number;
  phase: string;
  bids: (number | null)[];
  tricks: (number | null)[];
  scores: (number | null)[];
}

type ViewerState = "loading" | "connected" | "not_found" | "error";

export default function WhistViewerPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [state, setState] = useState<ViewerState>("loading");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial room data
  useEffect(() => {
    if (!code) {
      setState("not_found");
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabaseGames
          .from("scoretracker_rooms")
          .select("*")
          .eq("code", code)
          .single();

        if (fetchError || !data) {
          setState("not_found");
          return;
        }

        setRoom(data);
        setState("connected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
        setState("error");
      }
    };

    fetchRoom();
  }, [code]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!code || state !== "connected") return;

    const channel = supabase
      .channel(`scoretracker:${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "games",
          table: "scoretracker_rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as RoomData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, state]);

  // Compute derived values from room state
  const whistData = room?.game_state || [];
  const players = room?.players || [];

  const whistTotals = players.map((_, playerIndex) =>
    whistData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );

  const whistActiveRoundIndex = whistData.findIndex(
    (r) => r.phase === "bidding" || r.phase === "tricks"
  );

  const whistIsComplete =
    whistData.length > 0 && whistData.every((r) => r.phase === "complete");

  // Loading state
  if (state === "loading") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-loading">Connecting to game...</div>
        </div>
      </div>
    );
  }

  // Not found state
  if (state === "not_found") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-error">
            <h2>Game not found</h2>
            <p>This game may have ended or the link is invalid.</p>
            <a href="/score-tracker" className="btn btn-primary">
              Back to Score Tracker
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="screen score-tracker">
        <div className="viewer-status">
          <div className="viewer-error">
            <h2>Connection error</h2>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected - render read-only ScoreTable
  return (
    <div className="screen score-tracker score-tracker-playing">
      <ScoreTable
        gameType="whist"
        players={players}
        teams={[]}
        rounds={[]}
        totals={[]}
        leaderIndex={-1}
        config={{ name: "Whist", minPlayers: 3, maxPlayers: 6 }}
        isTeamGame={false}
        // Whist-specific props
        whistData={whistData}
        whistTotals={whistTotals}
        whistActiveRoundIndex={whistActiveRoundIndex}
        whistIsComplete={whistIsComplete}
        // Rentz props (not used for Whist viewer)
        rentzData={[]}
        rentzConfig={{}}
        rentzTotals={[]}
        rentzActiveRoundIndex={-1}
        rentzIsComplete={false}
        rentzCurrentDealerIndex={-1}
        rentzDealerGames={[]}
        rentzMiniGames={{}}
        // General props (not used for Whist viewer)
        generalData={[]}
        generalCurrentPlayer={0}
        generalTotals={[]}
        generalLeaderIndex={-1}
        generalCanUndo={false}
        // View-only mode
        isViewOnly={true}
        // Unused callbacks (view-only)
        onAddRound={() => {}}
        onUpdateRound={() => {}}
        onDeleteRound={() => {}}
        onUpdateWhistBids={() => {}}
        onUpdateWhistTricks={() => {}}
        onRevertWhistToBidding={() => {}}
        onSelectRentzMiniGame={() => {}}
        onUpdateRentzScores={() => {}}
        onRevertRentzToSelecting={() => {}}
        onAddGeneralScore={() => {}}
        onUndoGeneralScore={() => {}}
        onEditGeneralScore={() => {}}
        onDeleteGeneralRound={() => {}}
        onReset={() => {}}
        onBackToMenu={() => {}}
      />
    </div>
  );
}
