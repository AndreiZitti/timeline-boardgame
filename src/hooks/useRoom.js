import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { generateRoomCode, assignNumbers } from '../lib/random'

// Get or create player ID from localStorage
function getPlayerId() {
  let id = localStorage.getItem('playerId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('playerId', id)
  }
  return id
}

// Get saved player name from localStorage
function getSavedName() {
  return localStorage.getItem('playerName') || ''
}

// Save player name to localStorage
function savePlayerName(name) {
  localStorage.setItem('playerName', name)
}

// Get profile stats from localStorage
function getProfileStats() {
  return {
    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0', 10),
    gamesHosted: parseInt(localStorage.getItem('gamesHosted') || '0', 10)
  }
}

// Increment games played counter
function incrementGamesPlayed() {
  const current = parseInt(localStorage.getItem('gamesPlayed') || '0', 10)
  localStorage.setItem('gamesPlayed', (current + 1).toString())
}

// Increment games hosted counter
function incrementGamesHosted() {
  const current = parseInt(localStorage.getItem('gamesHosted') || '0', 10)
  localStorage.setItem('gamesHosted', (current + 1).toString())
}

// Get saved room code from localStorage
function getSavedRoomCode() {
  return localStorage.getItem('roomCode') || null
}

// Save room code to localStorage
function saveRoomCode(code) {
  if (code) {
    localStorage.setItem('roomCode', code)
  } else {
    localStorage.removeItem('roomCode')
  }
}

// Get room code from URL params
function getRoomCodeFromURL() {
  const params = new URLSearchParams(window.location.search)
  return params.get('room')?.toUpperCase() || null
}

// Update URL with room code
function updateURLWithRoomCode(code) {
  const url = new URL(window.location.href)
  if (code) {
    url.searchParams.set('room', code)
  } else {
    url.searchParams.delete('room')
  }
  window.history.replaceState({}, '', url)
}

export function useRoom() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playerId] = useState(getPlayerId)
  const [savedName, setSavedName] = useState(getSavedName)
  const [profileStats, setProfileStats] = useState(getProfileStats)

  // Get current player from room
  const currentPlayer = room?.players?.find(p => p.id === playerId)
  const isHost = room?.players?.[0]?.id === playerId

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.code) return

    const channel = supabase
      .channel(`room:${room.code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${room.code}`
        },
        (payload) => {
          if (payload.new) {
            // Check if phase changed to 'revealed' - count as game played
            if (payload.old?.phase !== 'revealed' && payload.new.phase === 'revealed') {
              incrementGamesPlayed()
              setProfileStats(getProfileStats())
            }
            setRoom(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.code])

  // Try to rejoin a room (from URL or localStorage)
  const tryRejoin = useCallback(async () => {
    const urlCode = getRoomCodeFromURL()
    const savedCode = getSavedRoomCode()
    const code = urlCode || savedCode

    if (!code) return null

    setLoading(true)
    try {
      const { data: existingRoom, error: fetchError } = await supabase
        .from('rooms')
        .select()
        .eq('code', code)
        .single()

      if (fetchError || !existingRoom) {
        // Room doesn't exist anymore, clear saved data
        saveRoomCode(null)
        updateURLWithRoomCode(null)
        return null
      }

      // Check if we're in this room
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)
        setRoom(existingRoom)
        return existingRoom
      }

      // We're not in the room - if there's a URL code, return it for joining
      // Otherwise clear saved data
      if (urlCode) {
        return { code: urlCode, needsJoin: true }
      }

      saveRoomCode(null)
      return null
    } catch (err) {
      saveRoomCode(null)
      updateURLWithRoomCode(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

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
        category: null,
        mode: 'table', // 'table' or 'remote'
        players: [{ id: playerId, name: hostName, number: null, hidden: true, confirmed: false, slot: null }]
      }

      const { data, error: supabaseError } = await supabase
        .from('rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      // Save to localStorage and URL
      savePlayerName(hostName)
      saveRoomCode(data.code)
      updateURLWithRoomCode(data.code)

      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

  // Join an existing room
  const joinRoom = useCallback(async (code, playerName) => {
    setLoading(true)
    setError(null)

    try {
      // First fetch the room
      const { data: existingRoom, error: fetchError } = await supabase
        .from('rooms')
        .select()
        .eq('code', code.toUpperCase())
        .single()

      if (fetchError) throw new Error('Room not found')
      if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

      // Check if player already in room
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        // Save to localStorage and URL
        savePlayerName(playerName)
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)

        setRoom(existingRoom)
        return existingRoom
      }

      // Add player to room
      const updatedPlayers = [
        ...existingRoom.players,
        { id: playerId, name: playerName, number: null, hidden: true, confirmed: false, slot: null }
      ]

      const { data, error: updateError } = await supabase
        .from('rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      // Save to localStorage and URL
      savePlayerName(playerName)
      saveRoomCode(data.code)
      updateURLWithRoomCode(data.code)

      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

  // Set category (host only)
  const setCategory = useCallback(async (category) => {
    if (!room || !isHost) return

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ category })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Set game mode (host only)
  const setMode = useCallback(async (mode) => {
    if (!room || !isHost) return

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ mode })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Start round (host only)
  const startRound = useCallback(async () => {
    if (!room || !isHost) return

    const playersWithNumbers = assignNumbers(room.players, room.code, room.round)
    // Reset slots for new round
    const playersReset = playersWithNumbers.map(p => ({ ...p, slot: null }))

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        players: playersReset,
        phase: 'playing'
      })
      .eq('code', room.code)

    if (!updateError) {
      // Increment games hosted counter
      incrementGamesHosted()
      setProfileStats(getProfileStats())
    } else {
      setError(updateError.message)
    }
  }, [room, isHost])

  // Toggle number visibility
  const toggleHidden = useCallback(async () => {
    if (!room || !currentPlayer) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, hidden: !p.hidden } : p
    )

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, currentPlayer, playerId])

  // Update player's slot position (for remote mode)
  const updateSlot = useCallback(async (newSlot) => {
    if (!room || !currentPlayer) return

    // Check if slot is already taken by another player
    const slotTaken = room.players.find(p => p.slot === newSlot && p.id !== playerId)

    let updatedPlayers
    if (slotTaken) {
      // Swap slots with the other player
      const myCurrentSlot = currentPlayer.slot
      updatedPlayers = room.players.map(p => {
        if (p.id === playerId) return { ...p, slot: newSlot }
        if (p.id === slotTaken.id) return { ...p, slot: myCurrentSlot }
        return p
      })
    } else {
      // Just update my slot
      updatedPlayers = room.players.map(p =>
        p.id === playerId ? { ...p, slot: newSlot } : p
      )
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, currentPlayer, playerId])

  // Reveal all numbers (host only)
  const revealNumbers = useCallback(async () => {
    if (!room || !isHost) return

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ phase: 'revealed' })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Next round (host only)
  const nextRound = useCallback(async () => {
    if (!room || !isHost) return

    const resetPlayers = room.players.map(p => ({
      ...p,
      number: null,
      hidden: true,
      confirmed: false,
      slot: null
    }))

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        players: resetPlayers,
        round: room.round + 1,
        phase: 'lobby',
        category: null
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Leave room
  const leaveRoom = useCallback(() => {
    saveRoomCode(null)
    updateURLWithRoomCode(null)
    setRoom(null)
    setError(null)
  }, [])

  // Update profile name
  const updateProfileName = useCallback((name) => {
    savePlayerName(name)
    setSavedName(name)
  }, [])

  // Get full profile object
  const profile = {
    playerId,
    name: savedName,
    ...profileStats
  }

  return {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    savedName,
    profile,
    createRoom,
    joinRoom,
    tryRejoin,
    setCategory,
    setMode,
    startRound,
    toggleHidden,
    updateSlot,
    revealNumbers,
    nextRound,
    leaveRoom,
    updateProfileName
  }
}
