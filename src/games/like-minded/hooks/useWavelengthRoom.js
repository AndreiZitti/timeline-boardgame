import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { getRandomSpectrum } from '../data/spectrums'
import { useUser } from '@/contexts/UserContext'

// Generate a random 4-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Excluded I and O to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get saved wavelength room code
function getSavedRoomCode() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('wavelengthRoomCode') || null
}

// Save wavelength room code
function saveRoomCode(code) {
  if (typeof window === 'undefined') return
  if (code) {
    localStorage.setItem('wavelengthRoomCode', code)
  } else {
    localStorage.removeItem('wavelengthRoomCode')
  }
}

// Calculate score based on distance
export function calculateScore(target, guess) {
  const distance = Math.abs(target - guess)

  if (distance <= 5) {
    return { teamPoints: 4, gamePoints: 0, zone: 'bullseye' }
  }
  if (distance <= 12) {
    return { teamPoints: 3, gamePoints: 0, zone: 'close' }
  }
  if (distance <= 20) {
    return { teamPoints: 2, gamePoints: 0, zone: 'near' }
  }

  const gamePoints = Math.min(4, Math.ceil(distance / 20))
  return { teamPoints: 0, gamePoints, zone: 'miss' }
}

export function useWavelengthRoom() {
  const { profile, updateName } = useUser()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use playerId and name from UserContext
  const playerId = profile.id
  const savedName = profile.name

  // Derived state - players are now objects with {id, name}
  const players = room?.players || []
  const currentPlayer = players.find(p => p.id === playerId)
  const currentPlayerName = currentPlayer?.name || savedName
  const isHost = players.length > 0 && players[0]?.id === playerId
  const isPsychic = room?.current_psychic_id === playerId
  const psychicIndex = players.findIndex(p => p.id === room?.current_psychic_id)
  const currentPsychic = players.find(p => p.id === room?.current_psychic_id)

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.code) return

    const channel = supabase
      .channel(`likeminded:${room.code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'games',
          table: 'likeminded_rooms',
          filter: `code=eq.${room.code}`
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new)
          } else if (payload.eventType === 'DELETE') {
            // Room was deleted
            setRoom(null)
            saveRoomCode(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.code])

  // Try to rejoin a room
  const tryRejoin = useCallback(async () => {
    const code = getSavedRoomCode()

    if (!code || !playerId) return null

    setLoading(true)
    try {
      const { data: existingRoom, error: fetchError } = await supabaseGames
        .from('likeminded_rooms')
        .select()
        .eq('code', code)
        .single()

      if (fetchError || !existingRoom) {
        saveRoomCode(null)
        return null
      }

      // Check if we're in this room (by id now)
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        setRoom(existingRoom)
        return existingRoom
      }

      saveRoomCode(null)
      return null
    } catch (err) {
      saveRoomCode(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

  // Create a new room
  const createRoom = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const code = generateRoomCode()
      // Use saved name if available, otherwise empty (will be set in lobby)
      const playerName = savedName || ''
      const newRoom = {
        code,
        phase: 'lobby',
        current_psychic_id: null,
        spectrum: null,
        target: null,
        clue: null,
        guess: null,
        team_score: 0,
        game_score: 0,
        players: [{ id: playerId, name: playerName }],
        used_spectrums: [],
        metadata: {}
      }

      const { data, error: supabaseError } = await supabaseGames
        .from('likeminded_rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      saveRoomCode(data.code)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId, savedName])

  // Join an existing room
  const joinRoom = useCallback(async (code) => {
    setLoading(true)
    setError(null)

    try {
      const { data: existingRoom, error: fetchError } = await supabaseGames
        .from('likeminded_rooms')
        .select()
        .eq('code', code.toUpperCase())
        .single()

      if (fetchError) throw new Error('Room not found')
      if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

      // Check if player already in room (by id)
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        // Already in room, just reconnect
        saveRoomCode(existingRoom.code)
        setRoom(existingRoom)
        return existingRoom
      }

      // Use saved name if available, otherwise empty (will be set in lobby)
      const playerName = savedName || ''

      // Add player to room
      const updatedPlayers = [...existingRoom.players, { id: playerId, name: playerName }]

      const { data, error: updateError } = await supabaseGames
        .from('likeminded_rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      saveRoomCode(data.code)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId, savedName])

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!room || !isHost || players.length < 2) return

    const spectrum = getRandomSpectrum(room.used_spectrums || [])
    const target = Math.floor(Math.random() * 101)
    const firstPsychicId = players[0].id

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({
        phase: 'psychic',
        current_psychic_id: firstPsychicId,
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        used_spectrums: [...(room.used_spectrums || []), spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Submit clue (psychic only)
  const submitClue = useCallback(async (clue) => {
    if (!room || !isPsychic) return

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({
        clue: clue,
        phase: 'guessing'
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isPsychic])

  // Lock in guess (any non-psychic)
  const lockInGuess = useCallback(async (guess) => {
    if (!room || isPsychic) return

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({
        guess: guess,
        phase: 'reveal'
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isPsychic])

  // Continue to next psychic (host only)
  const nextRound = useCallback(async () => {
    if (!room || !isHost) return

    // Calculate score for current round
    const result = calculateScore(room.target, room.guess)
    const newTeamScore = room.team_score + result.teamPoints
    const newGameScore = room.game_score + result.gamePoints

    // Rotate psychic
    const currentPsychicIndex = players.findIndex(p => p.id === room.current_psychic_id)
    const nextPsychicIndex = (currentPsychicIndex + 1) % players.length

    // Check if game should end (all players have been psychic once)
    if (nextPsychicIndex === 0) {
      const { error: updateError } = await supabaseGames
        .from('likeminded_rooms')
        .update({
          phase: 'end',
          team_score: newTeamScore,
          game_score: newGameScore
        })
        .eq('code', room.code)

      if (updateError) setError(updateError.message)
      return
    }

    // Continue to next psychic
    const spectrum = getRandomSpectrum(room.used_spectrums || [])
    const target = Math.floor(Math.random() * 101)
    const nextPsychicId = players[nextPsychicIndex].id

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({
        phase: 'psychic',
        current_psychic_id: nextPsychicId,
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        team_score: newTeamScore,
        game_score: newGameScore,
        used_spectrums: [...(room.used_spectrums || []), spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Play again (host only)
  const playAgain = useCallback(async () => {
    if (!room || !isHost) return

    const spectrum = getRandomSpectrum([])
    const target = Math.floor(Math.random() * 101)

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({
        phase: 'psychic',
        current_psychic_id: players[0].id,
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        team_score: 0,
        game_score: 0,
        used_spectrums: [spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (room && playerId) {
      const updatedPlayers = players.filter(p => p.id !== playerId)

      if (updatedPlayers.length === 0) {
        // Delete room if last player
        await supabaseGames
          .from('likeminded_rooms')
          .delete()
          .eq('code', room.code)
      } else {
        // Remove player from room
        const updates = { players: updatedPlayers }

        // If psychic leaves, assign to next player
        if (room.current_psychic_id === playerId) {
          updates.current_psychic_id = updatedPlayers[0].id
        }

        await supabaseGames
          .from('likeminded_rooms')
          .update(updates)
          .eq('code', room.code)
      }
    }

    saveRoomCode(null)
    setRoom(null)
    setError(null)
  }, [room, playerId, players])

  // Update current player's name in room and save to profile
  const updateMyName = useCallback(async (name) => {
    if (!room) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, name } : p
    )

    const { error: updateError } = await supabaseGames
      .from('likeminded_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) {
      setError(updateError.message)
    } else {
      // Also save to profile/localStorage
      updateName(name)
    }
  }, [room, playerId, updateName])

  return {
    room,
    loading,
    error,
    playerId,
    players,
    currentPlayer,
    currentPlayerName,
    currentPsychic,
    isHost,
    isPsychic,
    psychicIndex,
    savedName,
    createRoom,
    joinRoom,
    tryRejoin,
    startGame,
    submitClue,
    lockInGuess,
    nextPsychic: nextRound,  // Renamed for clarity
    playAgain,
    leaveRoom,
    updateMyName,
    setError
  }
}
