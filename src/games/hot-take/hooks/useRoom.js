import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { generateRoomCode, assignNumbers } from '../../../lib/random'
import { useUser } from '@/contexts/UserContext'

// Get saved room code from localStorage
function getSavedRoomCode() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('roomCode') || null
}

// Save room code to localStorage
function saveRoomCode(code) {
  if (typeof window === 'undefined') return
  if (code) {
    localStorage.setItem('roomCode', code)
  } else {
    localStorage.removeItem('roomCode')
  }
}

// Get room code from URL params
function getRoomCodeFromURL() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('room')?.toUpperCase() || null
}

// Update URL with room code
function updateURLWithRoomCode(code) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (code) {
    url.searchParams.set('room', code)
  } else {
    url.searchParams.delete('room')
  }
  window.history.replaceState({}, '', url)
}

export function useRoom() {
  const { profile, updateName, incrementGamesPlayed, incrementGamesHosted } = useUser()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use playerId from UserContext
  const playerId = profile.id

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
          schema: 'games',
          table: 'hottake_rooms',
          filter: `code=eq.${room.code}`
        },
        (payload) => {
          if (payload.new) {
            // Check if phase changed to 'revealed' - count as game played
            if (payload.old?.phase !== 'revealed' && payload.new.phase === 'revealed') {
              incrementGamesPlayed()
            }
            setRoom(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.code, incrementGamesPlayed])

  // Try to rejoin a room (from URL or localStorage)
  const tryRejoin = useCallback(async () => {
    const urlCode = getRoomCodeFromURL()
    const savedCode = getSavedRoomCode()
    const code = urlCode || savedCode

    if (!code) return null

    setLoading(true)
    try {
      const { data: existingRoom, error: fetchError } = await supabaseGames
        .from('hottake_rooms')
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
  const createRoom = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const code = generateRoomCode()
      // Use saved name if available, otherwise empty (will be set in lobby)
      const playerName = profile.name || ''
      const newRoom = {
        code,
        phase: 'lobby',
        round: 1,
        category: null,
        mode: 'table', // 'table' or 'remote'
        players: [{ id: playerId, name: playerName, number: null, hidden: true, confirmed: false, slot: null }]
      }

      const { data, error: supabaseError } = await supabaseGames
        .from('hottake_rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      // Save to localStorage and URL
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
  }, [playerId, profile.name])

  // Join an existing room
  const joinRoom = useCallback(async (code) => {
    setLoading(true)
    setError(null)

    try {
      // First fetch the room
      const { data: existingRoom, error: fetchError } = await supabaseGames
        .from('hottake_rooms')
        .select()
        .eq('code', code.toUpperCase())
        .single()

      if (fetchError) throw new Error('Room not found')
      if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

      // Check if player already in room
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        // Save to localStorage and URL
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)

        setRoom(existingRoom)
        return existingRoom
      }

      // Use saved name if available, otherwise empty (will be set in lobby)
      const playerName = profile.name || ''

      // Add player to room
      const updatedPlayers = [
        ...existingRoom.players,
        { id: playerId, name: playerName, number: null, hidden: true, confirmed: false, slot: null }
      ]

      const { data, error: updateError } = await supabaseGames
        .from('hottake_rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      // Save to localStorage and URL
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
  }, [playerId, profile.name])

  // Set category (host only)
  const setCategory = useCallback(async (category) => {
    if (!room || !isHost) return

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
      .update({ category })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Set game mode (host only)
  const setMode = useCallback(async (mode) => {
    if (!room || !isHost) return

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
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

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
      .update({
        players: playersReset,
        phase: 'playing'
      })
      .eq('code', room.code)

    if (!updateError) {
      // Increment games hosted counter
      incrementGamesHosted()
    } else {
      setError(updateError.message)
    }
  }, [room, isHost, incrementGamesHosted])

  // Toggle number visibility
  const toggleHidden = useCallback(async () => {
    if (!room || !currentPlayer) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, hidden: !p.hidden } : p
    )

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
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

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, currentPlayer, playerId])

  // Reveal all numbers (host only)
  const revealNumbers = useCallback(async () => {
    if (!room || !isHost) return

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
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

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
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

  // Update current player's name in room and save to profile
  const updateMyName = useCallback(async (name) => {
    if (!room) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, name } : p
    )

    const { error: updateError } = await supabaseGames
      .from('hottake_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) {
      setError(updateError.message)
    } else {
      // Also save to profile/localStorage
      updateName(name)
    }
  }, [room, playerId, updateName])

  // Update profile name (delegates to UserContext)
  const updateProfileName = useCallback((name) => {
    updateName(name)
  }, [updateName])

  return {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    savedName: profile.name,
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
    updateMyName,
    updateProfileName
  }
}
