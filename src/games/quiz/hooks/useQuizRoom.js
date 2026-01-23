import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { generateRoomCode } from '@/lib/random'
import { useUser } from '@/contexts/UserContext'
import { buildBoard, getCategories } from '../data/packs'
import { isAnswerCorrect, calculatePoints } from '../utils/matching'

// LocalStorage key for this game
const STORAGE_KEY = 'quizRoomCode'

// Timer duration in seconds
const ROUND_DURATION = 60

// Get saved room code from localStorage
function getSavedRoomCode() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY) || null
}

// Save room code to localStorage
function saveRoomCode(code) {
  if (typeof window === 'undefined') return
  if (code) {
    localStorage.setItem(STORAGE_KEY, code)
  } else {
    localStorage.removeItem(STORAGE_KEY)
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

export function useQuizRoom() {
  const { profile, updateName, incrementGamesPlayed, incrementGamesHosted } = useUser()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Player ID from UserContext
  const playerId = profile.id

  // Derived state
  const currentPlayer = room?.players?.find(p => p.id === playerId)
  const isHost = room?.host_id === playerId
  const isPicker = room?.picker_id === playerId
  const hasAnswered = currentPlayer?.hasAnswered || false

  // Get categories for board display
  const categories = room?.question_pack ? getCategories(room.question_pack) : []

  // Current question from board
  const currentQuestion = room?.current_question
    ? room.board?.[room.current_question.index]
    : null

  // Time remaining calculation
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION)

  // Timer effect
  useEffect(() => {
    if (room?.phase !== 'answering' || !room?.current_question?.started_at) {
      setTimeRemaining(ROUND_DURATION)
      return
    }

    const startTime = new Date(room.current_question.started_at).getTime()

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, ROUND_DURATION - elapsed)
      setTimeRemaining(remaining)

      // Auto-reveal when time runs out (host only)
      if (remaining === 0 && isHost) {
        revealAnswers()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [room?.phase, room?.current_question?.started_at, isHost])

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.code) return

    const channel = supabase
      .channel(`quiz:${room.code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'games',
          table: 'quiz_rooms',
          filter: `code=eq.${room.code}`
        },
        (payload) => {
          if (payload.new) {
            // Check if game ended - count as game played
            if (payload.old?.phase !== 'ended' && payload.new.phase === 'ended') {
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
        .from('quiz_rooms')
        .select()
        .eq('code', code)
        .single()

      if (fetchError || !existingRoom) {
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
        players: [{ id: playerId, name: hostName, score: 0, hasAnswered: false }],
        host_id: playerId,
        picker_id: playerId, // Host picks first
        question_pack: null,
        board: null,
        current_question: null
      }

      const { data, error: supabaseError } = await supabaseGames
        .from('quiz_rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      updateName(hostName)
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
  }, [playerId, updateName])

  // Join an existing room
  const joinRoom = useCallback(async (code, playerName) => {
    setLoading(true)
    setError(null)

    try {
      const { data: existingRoom, error: fetchError } = await supabaseGames
        .from('quiz_rooms')
        .select()
        .eq('code', code.toUpperCase())
        .single()

      if (fetchError) throw new Error('Room not found')
      if (existingRoom.phase !== 'lobby') throw new Error('Game already in progress')

      // Check if player already in room
      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        updateName(playerName)
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)
        setRoom(existingRoom)
        return existingRoom
      }

      // Add player to room
      const updatedPlayers = [
        ...existingRoom.players,
        { id: playerId, name: playerName, score: 0, hasAnswered: false }
      ]

      const { data, error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      updateName(playerName)
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
  }, [playerId, updateName])

  // Select question pack (host only, lobby phase)
  const selectPack = useCallback(async (packId) => {
    if (!room || !isHost || room.phase !== 'lobby') return

    const board = buildBoard(packId)
    if (!board) {
      setError('Invalid question pack')
      return
    }

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        question_pack: packId,
        board
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Start game (host only, needs pack selected)
  const startGame = useCallback(async () => {
    if (!room || !isHost || room.phase !== 'lobby') return

    if (!room.question_pack || !room.board) {
      setError('Please select a question pack first')
      return
    }

    if (room.players.length < 2) {
      setError('Need at least 2 players to start')
      return
    }

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ phase: 'picking' })
      .eq('code', room.code)

    if (!updateError) {
      incrementGamesHosted()
    } else {
      setError(updateError.message)
    }
  }, [room, isHost, incrementGamesHosted])

  // Select a question (picker only, picking phase)
  const selectQuestion = useCallback(async (questionIndex) => {
    if (!room || !isPicker || room.phase !== 'picking') return

    const question = room.board[questionIndex]
    if (!question || question.used) {
      setError('Invalid question selection')
      return
    }

    // Reset hasAnswered for all players
    const updatedPlayers = room.players.map(p => ({ ...p, hasAnswered: false }))

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'answering',
        players: updatedPlayers,
        current_question: {
          index: questionIndex,
          started_at: new Date().toISOString(),
          submissions: []
        }
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isPicker])

  // Submit answer (any player, answering phase)
  const submitAnswer = useCallback(async (answer) => {
    if (!room || room.phase !== 'answering' || hasAnswered) return

    const submission = {
      player_id: playerId,
      answer: answer.trim(),
      submitted_at: new Date().toISOString(),
      correct: null // Will be evaluated at reveal
    }

    // Get current submissions and add ours
    const currentSubmissions = room.current_question?.submissions || []
    const updatedSubmissions = [...currentSubmissions, submission]

    // Mark player as answered
    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, hasAnswered: true } : p
    )

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        players: updatedPlayers,
        current_question: {
          ...room.current_question,
          submissions: updatedSubmissions
        }
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, playerId, hasAnswered])

  // Reveal answers and award points (auto-called when timer ends or all answered)
  const revealAnswers = useCallback(async () => {
    if (!room || room.phase !== 'answering') return

    const question = room.board[room.current_question.index]
    const submissions = room.current_question.submissions || []

    // Evaluate all submissions
    const evaluatedSubmissions = submissions.map(s => ({
      ...s,
      correct: isAnswerCorrect(s.answer, question.answer, question.alternates)
    }))

    // Calculate points
    const pointsAwarded = calculatePoints(evaluatedSubmissions, question.value)

    // Update player scores
    const updatedPlayers = room.players.map(p => {
      const awarded = pointsAwarded.find(pa => pa.player_id === p.id)
      return awarded ? { ...p, score: p.score + awarded.points } : p
    })

    // Mark question as used
    const updatedBoard = room.board.map((q, i) =>
      i === room.current_question.index ? { ...q, used: true } : q
    )

    // Determine next picker (highest scorer from this round, or first correct)
    let nextPickerId = room.picker_id
    if (pointsAwarded.length > 0) {
      nextPickerId = pointsAwarded[0].player_id
    }

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'reveal',
        players: updatedPlayers,
        board: updatedBoard,
        picker_id: nextPickerId,
        current_question: {
          ...room.current_question,
          submissions: evaluatedSubmissions,
          points_awarded: pointsAwarded
        }
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room])

  // Continue to next question (any player can trigger in reveal phase)
  const continueGame = useCallback(async () => {
    if (!room || room.phase !== 'reveal') return

    // Check if board is cleared
    const remainingQuestions = room.board.filter(q => !q.used).length

    if (remainingQuestions === 0) {
      // Game over
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'ended',
          current_question: null
        })
        .eq('code', room.code)

      if (updateError) setError(updateError.message)
    } else {
      // Back to picking
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'picking',
          current_question: null
        })
        .eq('code', room.code)

      if (updateError) setError(updateError.message)
    }
  }, [room])

  // End game early (host only)
  const endGameEarly = useCallback(async () => {
    if (!room || !isHost) return

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'ended',
        current_question: null
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Play again (host only)
  const playAgain = useCallback(async () => {
    if (!room || !isHost) return

    // Reset board and scores
    const freshBoard = buildBoard(room.question_pack)
    const resetPlayers = room.players.map(p => ({
      ...p,
      score: 0,
      hasAnswered: false
    }))

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        phase: 'lobby',
        players: resetPlayers,
        board: freshBoard,
        picker_id: room.host_id,
        current_question: null
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

  // Get sorted players by score (for scoreboard)
  const sortedPlayers = room?.players
    ? [...room.players].sort((a, b) => b.score - a.score)
    : []

  // Get remaining question count
  const remainingQuestions = room?.board
    ? room.board.filter(q => !q.used).length
    : 0

  return {
    // State
    room,
    loading,
    error,
    playerId,

    // Derived
    currentPlayer,
    isHost,
    isPicker,
    hasAnswered,
    categories,
    currentQuestion,
    timeRemaining,
    sortedPlayers,
    remainingQuestions,

    // User profile
    savedName: profile.name,

    // Room actions
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,

    // Lobby actions
    selectPack,
    startGame,

    // Game actions
    selectQuestion,
    submitAnswer,
    revealAnswers,
    continueGame,
    endGameEarly,
    playAgain
  }
}
