import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { generateRoomCode } from '@/lib/random'
import { useUser } from '@/contexts/UserContext'
import { buildBoard, getCategories, getCategoriesFromBoard, isDynamicPack, DYNAMIC_PACKS } from '../data/packs'
import { isAnswerCorrect, calculatePoints } from '../utils/matching'
import { fetchOpenTDBBoard } from '../data/opentdb'
import { fetchBoardFromDB, voteOnQuestion } from '../data/questions-db'

// LocalStorage key for this game
const STORAGE_KEY = 'quizRoomCode'

// Timer duration in seconds
const ROUND_DURATION = 60

// Bot names pool
const BOT_NAMES = [
  'QuizBot', 'Trivia Tim', 'Smarty Pants', 'Know-It-All', 'Brain Bot',
  'Quiz Whiz', 'Clever Clara', 'Einstein Jr', 'The Professor', 'Genius Joe'
]

// Generate a bot ID
function generateBotId() {
  return `bot-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

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
  // Get categories - from board for dynamic packs, from pack definition for static
  const categories = room?.board 
    ? getCategoriesFromBoard(room.board) 
    : room?.question_pack 
      ? getCategories(room.question_pack) 
      : []

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
  // filters: { categories: number[], difficulties: string[], types: string[] }
  const selectPack = useCallback(async (packId, filters = null) => {
    if (!room || !isHost || room.phase !== 'lobby') return

    setLoading(true)
    setError(null)

    try {
      let board

      if (isDynamicPack(packId)) {
        // Fetch dynamic pack
        if (packId === 'opentdb') {
          // Live API fetch
          const result = await fetchOpenTDBBoard()
          board = result.board
        } else if (packId === 'opentdb-db') {
          // Database fetch with filters
          const options = filters ? {
            categoryIds: filters.categories,
            difficulties: filters.difficulties,
            types: filters.types
          } : {}
          const result = await fetchBoardFromDB(options)
          board = result.board
        } else {
          throw new Error('Unknown dynamic pack')
        }
      } else {
        // Build from static pack
        board = buildBoard(packId)
      }

      if (!board) {
        setError('Failed to load question pack')
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
    } catch (err) {
      setError(err.message || 'Failed to load questions')
    } finally {
      setLoading(false)
    }
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
    // For multiple choice/boolean: exact match (case-insensitive)
    // For text input: use fuzzy matching
    const evaluatedSubmissions = submissions.map(s => {
      let isCorrect
      if (question.type === 'multiple' || question.type === 'boolean') {
        // Exact match for multiple choice (case-insensitive)
        isCorrect = s.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
      } else {
        // Fuzzy match for free text
        isCorrect = isAnswerCorrect(s.answer, question.answer, question.alternates)
      }
      return { ...s, correct: isCorrect }
    })

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

  // Add a bot player (host only, lobby phase)
  const addBot = useCallback(async () => {
    if (!room || !isHost || room.phase !== 'lobby') return

    // Pick a random name not already used
    const usedNames = room.players.map(p => p.name)
    const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n))
    const botName = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Bot ${room.players.length + 1}`

    const botPlayer = {
      id: generateBotId(),
      name: botName,
      score: 0,
      hasAnswered: false,
      isBot: true
    }

    const updatedPlayers = [...room.players, botPlayer]

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Remove a bot player (host only, lobby phase)
  const removeBot = useCallback(async (botId) => {
    if (!room || !isHost || room.phase !== 'lobby') return

    const updatedPlayers = room.players.filter(p => p.id !== botId)

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Bot behavior effect - auto-play for bots
  useEffect(() => {
    if (!room || !isHost) return // Only host runs bot logic

    const bots = room.players.filter(p => p.isBot)
    if (bots.length === 0) return

    // Bot picks a question (picking phase)
    if (room.phase === 'picking') {
      const pickerBot = bots.find(b => b.id === room.picker_id)
      if (pickerBot) {
        // Random delay 1-3 seconds
        const delay = 1000 + Math.random() * 2000
        const timeout = setTimeout(async () => {
          // Pick a random available question
          const availableQuestions = room.board
            .map((q, i) => ({ ...q, index: i }))
            .filter(q => !q.used)
          if (availableQuestions.length > 0) {
            const pick = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
            // Directly update DB (bypass isPicker check since we're the host running bot logic)
            const updatedPlayers = room.players.map(p => ({ ...p, hasAnswered: false }))
            await supabaseGames
              .from('quiz_rooms')
              .update({
                phase: 'answering',
                players: updatedPlayers,
                current_question: {
                  index: pick.index,
                  started_at: new Date().toISOString(),
                  submissions: []
                }
              })
              .eq('code', room.code)
          }
        }, delay)
        return () => clearTimeout(timeout)
      }
    }

    // Bots answer questions (answering phase)
    if (room.phase === 'answering' && room.current_question) {
      const question = room.board[room.current_question.index]
      const botsWhoHaventAnswered = bots.filter(b => !b.hasAnswered)

      if (botsWhoHaventAnswered.length > 0) {
        // Each bot answers with random delay
        const timeouts = botsWhoHaventAnswered.map((bot, i) => {
          const delay = 2000 + Math.random() * 8000 // 2-10 seconds
          return setTimeout(async () => {
            // 70% chance to get correct answer
            const isCorrect = Math.random() < 0.7
            let answer
            if (question.type === 'multiple' || question.type === 'boolean') {
              if (isCorrect) {
                answer = question.answer
              } else {
                // Pick wrong answer
                const wrongAnswers = question.options.filter(o => o !== question.answer)
                answer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] || question.answer
              }
            } else {
              answer = isCorrect ? question.answer : 'Wrong answer'
            }

            // Submit bot answer
            const { data: freshRoom } = await supabaseGames
              .from('quiz_rooms')
              .select()
              .eq('code', room.code)
              .single()

            if (freshRoom?.phase !== 'answering') return // Phase changed

            const currentSubmissions = freshRoom.current_question?.submissions || []
            if (currentSubmissions.some(s => s.player_id === bot.id)) return // Already answered

            const submission = {
              player_id: bot.id,
              answer,
              submitted_at: new Date().toISOString(),
              correct: null
            }

            const updatedSubmissions = [...currentSubmissions, submission]
            const updatedPlayers = freshRoom.players.map(p =>
              p.id === bot.id ? { ...p, hasAnswered: true } : p
            )

            await supabaseGames
              .from('quiz_rooms')
              .update({
                players: updatedPlayers,
                current_question: {
                  ...freshRoom.current_question,
                  submissions: updatedSubmissions
                }
              })
              .eq('code', room.code)
          }, delay)
        })
        return () => timeouts.forEach(t => clearTimeout(t))
      }
    }

    // Bot continues after reveal (reveal phase)
    if (room.phase === 'reveal') {
      const pickerBot = bots.find(b => b.id === room.picker_id)
      if (pickerBot) {
        // Auto-continue after 3-5 seconds
        const delay = 3000 + Math.random() * 2000
        const timeout = setTimeout(async () => {
          const remainingQ = room.board.filter(q => !q.used).length
          if (remainingQ === 0) {
            await supabaseGames
              .from('quiz_rooms')
              .update({ phase: 'ended', current_question: null })
              .eq('code', room.code)
          } else {
            await supabaseGames
              .from('quiz_rooms')
              .update({ phase: 'picking', current_question: null })
              .eq('code', room.code)
          }
        }, delay)
        return () => clearTimeout(timeout)
      }
    }
  }, [room?.phase, room?.picker_id, room?.current_question?.index, room?.code, isHost])

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
    addBot,
    removeBot,

    // Game actions
    selectQuestion,
    submitAnswer,
    revealAnswers,
    continueGame,
    endGameEarly,
    playAgain
  }
}
