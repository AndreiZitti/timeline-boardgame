import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseGames } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { generateShortCode } from '@/lib/random';
import { useScoreTracker } from './useScoreTracker';

/**
 * Wrapper around useScoreTracker that syncs to Supabase for authenticated users.
 * Enables live view sharing via room code for Septica.
 */
export function useSepticaRoom() {
  const { isAuthenticated, user } = useUser();
  const scoreTracker = useScoreTracker('septica');

  const [roomCode, setRoomCode] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track if we've created a room for this session
  const roomCreatedRef = useRef(false);

  // Create room when game starts (authenticated users only)
  const createRoom = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return null;
    if (roomCreatedRef.current) return roomCode;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const code = generateShortCode();

      const { data, error } = await supabaseGames
        .from('scoretracker_rooms')
        .insert({
          code,
          game_type: 'septica',
          host_id: user.id,
          players: scoreTracker.teams.flat(), // Flatten team names for storage
          game_config: { teams: scoreTracker.teams },
          game_state: scoreTracker.rounds,
        })
        .select()
        .single();

      if (error) throw error;

      roomCreatedRef.current = true;
      setRoomCode(data.code);
      return data.code;
    } catch (err) {
      console.error('Failed to create room:', err);
      setSyncError(err.message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user?.id, scoreTracker.teams, scoreTracker.rounds, roomCode]);

  // Sync state to Supabase whenever rounds change
  useEffect(() => {
    if (!roomCode || !isAuthenticated) return;
    if (scoreTracker.teams.length === 0) return;

    const syncState = async () => {
      try {
        await supabaseGames
          .from('scoretracker_rooms')
          .update({
            game_state: scoreTracker.rounds,
            game_config: { teams: scoreTracker.teams },
            updated_at: new Date().toISOString(),
          })
          .eq('code', roomCode);
      } catch (err) {
        console.error('Failed to sync state:', err);
        setSyncError(err.message);
      }
    };

    syncState();
  }, [roomCode, isAuthenticated, scoreTracker.rounds, scoreTracker.teams]);

  // Wrap startTeamGame to also create room
  const startTeamGame = useCallback(async (teamNames) => {
    scoreTracker.startTeamGame(teamNames);

    // Create room after state is set (next tick)
    if (isAuthenticated) {
      setTimeout(async () => {
        await createRoom();
      }, 100);
    }
  }, [scoreTracker, isAuthenticated, createRoom]);

  // Clean up room on new game
  const newGame = useCallback(() => {
    roomCreatedRef.current = false;
    setRoomCode(null);
    setSyncError(null);
    scoreTracker.newGame();
  }, [scoreTracker]);

  // Generate share URL
  const shareUrl = roomCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/score-tracker/septica/view/${roomCode}`
    : null;

  return {
    ...scoreTracker,
    startTeamGame,
    newGame,
    // Live view specific
    roomCode,
    shareUrl,
    syncError,
    isSyncing,
    isLiveEnabled: isAuthenticated,
  };
}
