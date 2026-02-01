"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, supabaseGames } from "@/lib/supabase/client";
import { ScoreTable } from "@/games/score-tracker/components/ScoreTable";
import "@/games/score-tracker/score-tracker.css";

// Rentz mini-games configuration (must match useScoreTracker)
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

interface RoomData {
  code: string;
  game_type: string;
  players: string[];
  game_config: Record<string, unknown>;
  game_state: RentzRound[];
}

interface RentzRound {
  index: number;
  dealerIndex: number;
  dealerRound: number;
  miniGame: string | null;
  isBlind: boolean;
  phase: string;
  inputs: Record<string, unknown> | null;
  scores: (number | null)[];
}

type ViewerState = "loading" | "connected" | "not_found" | "error";

export default function RentzViewerPage() {
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
  const rentzData = room?.game_state || [];
  const players = room?.players || [];
  const rentzConfig = room?.game_config || {};

  const rentzTotals = players.map((_, playerIndex) =>
    rentzData.reduce((sum, round) => sum + (round.scores?.[playerIndex] || 0), 0)
  );

  const rentzActiveRoundIndex = rentzData.findIndex(
    (r) => r.phase === "selecting" || r.phase === "scoring"
  );

  const rentzIsComplete =
    rentzData.length > 0 && rentzData.every((r) => r.phase === "complete");

  const rentzCurrentDealerIndex =
    rentzActiveRoundIndex >= 0 ? rentzData[rentzActiveRoundIndex]?.dealerIndex : -1;

  // Get games played by each dealer
  const rentzDealerGames = players.map((_, dealerIndex) => {
    const dealerRounds = rentzData.filter((r) => r.dealerIndex === dealerIndex);
    return dealerRounds.reduce((acc: Record<string, boolean>, round) => {
      if (round.miniGame && round.phase === "complete") {
        acc[round.miniGame] = true;
      }
      return acc;
    }, {});
  });

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
        gameType="rentz"
        players={players}
        teams={[]}
        rounds={[]}
        totals={[]}
        leaderIndex={-1}
        config={{ name: "Rentz", minPlayers: 3, maxPlayers: 6 }}
        isTeamGame={false}
        // Whist props (not used for Rentz viewer)
        whistData={[]}
        whistTotals={[]}
        whistActiveRoundIndex={-1}
        whistIsComplete={false}
        // Rentz-specific props
        rentzData={rentzData}
        rentzConfig={rentzConfig}
        rentzTotals={rentzTotals}
        rentzActiveRoundIndex={rentzActiveRoundIndex}
        rentzIsComplete={rentzIsComplete}
        rentzCurrentDealerIndex={rentzCurrentDealerIndex}
        rentzDealerGames={rentzDealerGames}
        rentzMiniGames={RENTZ_MINI_GAMES}
        // General props (not used for Rentz viewer)
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
