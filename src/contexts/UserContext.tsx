"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface GameStats {
  gamesPlayed: number;
  gamesHosted: number;
}

interface Profile {
  id: string;
  name: string;
  gamesPlayed: number;
  gamesHosted: number;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface GameResult {
  gameType: string;
  playersCount?: number;
  won?: boolean;
  wasHost?: boolean;
}

interface TrackerResult {
  trackerType: string;
  players: string[];
  scores: number[];
  winnerIndex?: number;
}

interface ActivityItem {
  id: string;
  type: 'game' | 'tracker';
  name: string;       // game_type or tracker_type
  playedAt: string;
  // For games:
  playersCount?: number;
  won?: boolean;
  // For trackers:
  players?: string[];
  scores?: number[];
  winnerIndex?: number;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  profile: Profile;
  updateName: (name: string) => void;
  incrementGamesPlayed: () => void;
  incrementGamesHosted: () => void;
  recordGameResult: (result: GameResult) => Promise<void>;
  recordTrackerResult: (result: TrackerResult) => Promise<void>;
  getRecentActivity: (limit?: number) => Promise<ActivityItem[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// localStorage helpers
function getLocalPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("playerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("playerId", id);
  }
  return id;
}

function getLocalName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("playerName") || "";
}

function getLocalStats(): GameStats {
  if (typeof window === "undefined") return { gamesPlayed: 0, gamesHosted: 0 };
  return {
    gamesPlayed: parseInt(localStorage.getItem("gamesPlayed") || "0", 10),
    gamesHosted: parseInt(localStorage.getItem("gamesHosted") || "0", 10),
  };
}

function setLocalStats(stats: GameStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem("gamesPlayed", stats.gamesPlayed.toString());
  localStorage.setItem("gamesHosted", stats.gamesHosted.toString());
}

function getLocalActivity(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("recentActivity") || "[]");
  } catch {
    return [];
  }
}

function addLocalActivity(item: ActivityItem) {
  if (typeof window === "undefined") return;
  const activity = getLocalActivity();
  activity.unshift(item);
  // Keep only last 50 items
  localStorage.setItem("recentActivity", JSON.stringify(activity.slice(0, 50)));
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, gamesHosted: 0 });
  const [playerId, setPlayerId] = useState("");

  const supabase = useMemo(() => createClient(), []);

  // Initialize auth state and profile
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session with timeout
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        );

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        setUser(session?.user ?? null);
        setPlayerId(session?.user?.id ?? getLocalPlayerId());
        setName(getLocalName());

        if (session?.user) {
          // Fetch stats from Supabase for authenticated user (non-blocking)
          fetchSupabaseStats(session.user.id).catch(console.error);
        } else {
          // Use localStorage stats for guest
          setStats(getLocalStats());
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        // Fall back to guest mode
        setPlayerId(getLocalPlayerId());
        setName(getLocalName());
        setStats(getLocalStats());
      }

      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setPlayerId(session?.user?.id ?? getLocalPlayerId());

      if (event === "SIGNED_IN" && session?.user) {
        // Merge localStorage stats with Supabase on sign in (non-blocking)
        mergeStatsOnSignIn(session.user.id).catch(console.error);
      } else if (event === "SIGNED_OUT") {
        // Revert to localStorage stats
        setStats(getLocalStats());
      } else if (event === "TOKEN_REFRESHED" && !session) {
        // Token refresh failed - clear corrupted session
        console.warn("Token refresh failed, clearing session");
        supabase.auth.signOut().catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSupabaseStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .schema("games")
        .from("game_stats")
        .select("games_played, games_hosted")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch stats:", error);
        setStats(getLocalStats());
        return;
      }

      if (data) {
        const newStats = {
          gamesPlayed: data.games_played,
          gamesHosted: data.games_hosted,
        };
        setStats(newStats);
        // Also update localStorage as cache
        setLocalStats(newStats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setStats(getLocalStats());
    }
  };

  const mergeStatsOnSignIn = async (userId: string) => {
    try {
      const localStats = getLocalStats();

      // Get current Supabase stats
      const { data: existing } = await supabase
        .schema("games")
        .from("game_stats")
        .select("games_played, games_hosted")
        .eq("user_id", userId)
        .maybeSingle();

      // Merge: take the higher value (additive merge)
      const mergedStats = {
        gamesPlayed: Math.max(localStats.gamesPlayed, existing?.games_played ?? 0),
        gamesHosted: Math.max(localStats.gamesHosted, existing?.games_hosted ?? 0),
      };

      // Upsert to Supabase (don't await - fire and forget)
      supabase.schema("games").from("game_stats").upsert({
        user_id: userId,
        games_played: mergedStats.gamesPlayed,
        games_hosted: mergedStats.gamesHosted,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error("Failed to save stats:", error);
      });

      setStats(mergedStats);
      setLocalStats(mergedStats);
    } catch (err) {
      console.error("Failed to merge stats:", err);
      setStats(getLocalStats());
    }
  };

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const updateName = useCallback((newName: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("playerName", newName);
    }
    setName(newName);
  }, []);

  const updateStats = useCallback(
    async (newStats: GameStats) => {
      setStats(newStats);
      setLocalStats(newStats);

      // If authenticated, also update Supabase
      if (user) {
        await supabase.schema("games").from("game_stats").upsert({
          user_id: user.id,
          games_played: newStats.gamesPlayed,
          games_hosted: newStats.gamesHosted,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [user, supabase]
  );

  const incrementGamesPlayed = useCallback(() => {
    const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
    updateStats(newStats);
  }, [stats, updateStats]);

  const incrementGamesHosted = useCallback(() => {
    const newStats = { ...stats, gamesHosted: stats.gamesHosted + 1 };
    updateStats(newStats);
  }, [stats, updateStats]);

  const recordGameResult = useCallback(
    async (result: GameResult) => {
      const activityItem: ActivityItem = {
        id: crypto.randomUUID(),
        type: 'game',
        name: result.gameType,
        playedAt: new Date().toISOString(),
        playersCount: result.playersCount,
        won: result.won,
      };

      // Always save locally
      addLocalActivity(activityItem);

      // Update aggregate stats
      const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
      if (result.wasHost) {
        newStats.gamesHosted = stats.gamesHosted + 1;
      }
      await updateStats(newStats);

      // If authenticated, also save to Supabase
      if (user) {
        await supabase.schema("games").from("game_results").insert({
          user_id: user.id,
          game_type: result.gameType,
          players_count: result.playersCount,
          won: result.won,
          was_host: result.wasHost ?? false,
        });
      }
    },
    [user, supabase, stats, updateStats]
  );

  const recordTrackerResult = useCallback(
    async (result: TrackerResult) => {
      const activityItem: ActivityItem = {
        id: crypto.randomUUID(),
        type: 'tracker',
        name: result.trackerType,
        playedAt: new Date().toISOString(),
        players: result.players,
        scores: result.scores,
        winnerIndex: result.winnerIndex,
      };

      // Always save locally
      addLocalActivity(activityItem);

      // Update aggregate stats (count as game played)
      const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
      await updateStats(newStats);

      // If authenticated, also save to Supabase
      if (user) {
        await supabase.schema("games").from("tracker_results").insert({
          user_id: user.id,
          tracker_type: result.trackerType,
          players: result.players,
          scores: result.scores,
          winner_index: result.winnerIndex,
        });
      }
    },
    [user, supabase, stats, updateStats]
  );

  const getRecentActivity = useCallback(
    async (limit: number = 10): Promise<ActivityItem[]> => {
      if (!user) {
        // Return from localStorage for guests
        return getLocalActivity().slice(0, limit);
      }

      try {
        // Fetch from both tables and merge (with timeout)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const fetchPromise = Promise.all([
          supabase
            .schema("games")
            .from("game_results")
            .select("id, game_type, played_at, players_count, won")
            .eq("user_id", user.id)
            .order("played_at", { ascending: false })
            .limit(limit),
          supabase
            .schema("games")
            .from("tracker_results")
            .select("id, tracker_type, played_at, players, scores, winner_index")
            .eq("user_id", user.id)
            .order("played_at", { ascending: false })
            .limit(limit),
        ]);

        const [gameRes, trackerRes] = await Promise.race([fetchPromise, timeoutPromise]);

        // Check for errors
        if (gameRes.error || trackerRes.error) {
          console.error("Failed to fetch activity:", gameRes.error || trackerRes.error);
          return getLocalActivity().slice(0, limit);
        }

        const gameItems: ActivityItem[] = (gameRes.data || []).map((r) => ({
          id: r.id,
          type: 'game' as const,
          name: r.game_type,
          playedAt: r.played_at,
          playersCount: r.players_count,
          won: r.won,
        }));

        const trackerItems: ActivityItem[] = (trackerRes.data || []).map((r) => ({
          id: r.id,
          type: 'tracker' as const,
          name: r.tracker_type,
          playedAt: r.played_at,
          players: r.players,
          scores: r.scores,
          winnerIndex: r.winner_index,
        }));

        // Merge and sort by date
        return [...gameItems, ...trackerItems]
          .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
          .slice(0, limit);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        // Fall back to localStorage
        return getLocalActivity().slice(0, limit);
      }
    },
    [user, supabase]
  );

  const profile: Profile = {
    id: playerId,
    name,
    gamesPlayed: stats.gamesPlayed,
    gamesHosted: stats.gamesHosted,
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
        profile,
        updateName,
        incrementGamesPlayed,
        incrementGamesHosted,
        recordGameResult,
        recordTrackerResult,
        getRecentActivity,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
