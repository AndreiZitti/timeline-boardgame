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
      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setPlayerId(session?.user?.id ?? getLocalPlayerId());
      setName(getLocalName());

      if (session?.user) {
        // Fetch stats from Supabase for authenticated user
        await fetchSupabaseStats(session.user.id);
      } else {
        // Use localStorage stats for guest
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
