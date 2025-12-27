import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { getRandomSpectrum } from '../data/spectrums'

// Generate a random 4-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Excluded I and O to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get player ID from localStorage
function getPlayerId() {
  let id = localStorage.getItem('playerId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('playerId', id)
  }
  return id
}

// Get saved player name
function getSavedName() {
  return localStorage.getItem('playerName') || ''
}

// Save player name
function savePlayerName(name) {
  localStorage.setItem('playerName', name)
}

// Get saved wavelength room code
function getSavedRoomCode() {
  return localStorage.getItem('wavelengthRoomCode') || null
}

// Save wavelength room code
function saveRoomCode(code) {
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
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playerId] = useState(getPlayerId)
  const [savedName, setSavedName] = useState(getSavedName)

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
    const name = getSavedName()

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
  }, [])

  // Create a new room
  const createRoom = useCallback(async (hostName) => {
    setLoading(true)
    setError(null)

    try {
      const code = generateRoomCode()
      const newRoom = {
        code,
        phase: 'lobby',
        round: 1,
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

      savePlayerName(hostName)
      saveRoomCode(data.code)
      setSavedName(hostName)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

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

      savePlayerName(playerName)
      saveRoomCode(data.code)
      setSavedName(playerName)
      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Next round (host only)
  const nextRound = useCallback(async () => {
    if (!room || !isHost) return

    // Calculate score for current round
    const result = calculateScore(room.target, room.guess)
    const newTeamScore = room.team_score + result.teamPoints
    const newGameScore = room.game_score + result.gamePoints

    // Rotate psychic
    const currentPsychicIndex = players.indexOf(room.current_psychic)
    const nextPsychicIndex = (currentPsychicIndex + 1) % players.length

    // Check if all players have been psychic (round complete)
    const isEndOfRound = nextPsychicIndex === 0
    const newRound = isEndOfRound ? room.round + 1 : room.round

    // Check if game should end (each player was psychic once)
    if (isEndOfRound) {
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
        round: newRound,
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
        round: 1,
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

  // Update profile name
  const updateProfileName = useCallback((name) => {
    savePlayerName(name)
    setSavedName(name)
  }, [])

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
    nextRound,
    playAgain,
    leaveRoom,
    updateProfileName,
    setError
  }
}
