import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
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

  // Derived state
  const players = room?.players || []
  const currentPlayerName = savedName
  const isHost = players.length > 0 && players[0] === currentPlayerName
  const isPsychic = room?.current_psychic === currentPlayerName
  const psychicIndex = players.indexOf(room?.current_psychic)

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.code) return

    const channel = supabase
      .channel(`wavelength:${room.code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'games',
          table: 'wavelength_rooms',
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
    const name = savedName

    if (!code || !name) return null

    setLoading(true)
    try {
      const { data: existingRoom, error: fetchError } = await supabase
        .from('games.wavelength_rooms')
        .select()
        .eq('code', code)
        .single()

      if (fetchError || !existingRoom) {
        saveRoomCode(null)
        return null
      }

      // Check if we're in this room
      if (existingRoom.players.includes(name)) {
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
  }, [savedName])

  // Create a new room
  const createRoom = useCallback(async (hostName) => {
    setLoading(true)
    setError(null)

    try {
      const code = generateRoomCode()
      const newRoom = {
        code,
        phase: 'lobby',
        current_psychic: null,
        spectrum: null,
        target: null,
        clue: null,
        guess: null,
        team_score: 0,
        game_score: 0,
        players: [hostName],
        used_cards: []
      }

      const { data, error: supabaseError } = await supabase
        .from('games.wavelength_rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      updateName(hostName)
      saveRoomCode(data.code)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [updateName])

  // Join an existing room
  const joinRoom = useCallback(async (code, playerName) => {
    setLoading(true)
    setError(null)

    try {
      const { data: existingRoom, error: fetchError } = await supabase
        .from('games.wavelength_rooms')
        .select()
        .eq('code', code.toUpperCase())
        .single()

      if (fetchError) throw new Error('Room not found')
      if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

      // Check for duplicate name
      if (existingRoom.players.includes(playerName)) {
        throw new Error('Name already taken in this room')
      }

      // Add player to room
      const updatedPlayers = [...existingRoom.players, playerName]

      const { data, error: updateError } = await supabase
        .from('games.wavelength_rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      updateName(playerName)
      saveRoomCode(data.code)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [updateName])

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!room || !isHost || players.length < 2) return

    const spectrum = getRandomSpectrum(room.used_cards)
    const target = Math.floor(Math.random() * 101)
    const firstPsychic = players[0]

    const { error: updateError } = await supabase
      .from('games.wavelength_rooms')
      .update({
        phase: 'psychic',
        current_psychic: firstPsychic,
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        used_cards: [...room.used_cards, spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Submit clue (psychic only)
  const submitClue = useCallback(async (clue) => {
    if (!room || !isPsychic) return

    const { error: updateError } = await supabase
      .from('games.wavelength_rooms')
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

    const { error: updateError } = await supabase
      .from('games.wavelength_rooms')
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
    const currentPsychicIndex = players.indexOf(room.current_psychic)
    const nextPsychicIndex = (currentPsychicIndex + 1) % players.length

    // Check if game should end (all players have been psychic once)
    if (nextPsychicIndex === 0) {
      const { error: updateError } = await supabase
        .from('games.wavelength_rooms')
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
    const spectrum = getRandomSpectrum(room.used_cards)
    const target = Math.floor(Math.random() * 101)
    const nextPsychic = players[nextPsychicIndex]

    const { error: updateError } = await supabase
      .from('games.wavelength_rooms')
      .update({
        phase: 'psychic',
        current_psychic: nextPsychic,
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        team_score: newTeamScore,
        game_score: newGameScore,
        used_cards: [...room.used_cards, spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Play again (host only)
  const playAgain = useCallback(async () => {
    if (!room || !isHost) return

    const spectrum = getRandomSpectrum([])
    const target = Math.floor(Math.random() * 101)

    const { error: updateError } = await supabase
      .from('games.wavelength_rooms')
      .update({
        phase: 'psychic',
        current_psychic: players[0],
        spectrum: spectrum,
        target: target,
        clue: null,
        guess: null,
        team_score: 0,
        game_score: 0,
        used_cards: [spectrum.id]
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost, players])

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (room && currentPlayerName) {
      const updatedPlayers = players.filter(p => p !== currentPlayerName)

      if (updatedPlayers.length === 0) {
        // Delete room if last player
        await supabase
          .from('games.wavelength_rooms')
          .delete()
          .eq('code', room.code)
      } else {
        // Remove player from room
        const updates = { players: updatedPlayers }

        // If host leaves, might need to update psychic
        if (room.current_psychic === currentPlayerName) {
          updates.current_psychic = updatedPlayers[0]
        }

        await supabase
          .from('games.wavelength_rooms')
          .update(updates)
          .eq('code', room.code)
      }
    }

    saveRoomCode(null)
    setRoom(null)
    setError(null)
  }, [room, currentPlayerName, players])

  return {
    room,
    loading,
    error,
    playerId,
    players,
    currentPlayerName,
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
    setError
  }
}
