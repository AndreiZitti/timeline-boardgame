import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { generateRoomCode } from '@/lib/random'
import { useUser } from '@/contexts/UserContext'
import { getRandomQuestions, buildBoard } from '../data/hardcoded-questions'

// Simple answer matching - checks if user answer is in acceptable_answers array
function checkAnswer(userAnswer, acceptableAnswers) {
  const normalized = userAnswer.toLowerCase().trim()
  return acceptableAnswers.some(a => a.toLowerCase().trim() === normalized)
}

// LocalStorage key
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

// LocalStorage helpers
function getSavedRoomCode() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY) || null
}

function saveRoomCode(code) {
  if (typeof window === 'undefined') return
  if (code) {
    localStorage.setItem(STORAGE_KEY, code)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// URL helpers
function getRoomCodeFromURL() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('room')?.toUpperCase() || null
}

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

// Generate a short session token
function generateSessionToken() {
  return Math.random().toString(36).substring(2, 8)
}

// Get session token from URL
function getSessionTokenFromURL() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('session') || null
}

// Update URL with session token
function updateURLWithSessionToken(token) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (token) {
    url.searchParams.set('session', token)
  } else {
    url.searchParams.delete('session')
  }
  window.history.replaceState({}, '', url)
}

export function useQuizRoom() {
  const { profile, updateName, incrementGamesPlayed, incrementGamesHosted } = useUser()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const playerId = profile.id

  // Derived state
  const currentPlayer = room?.players?.find(p => p.id === playerId)
  const isHost = room?.host_id === playerId
  const isPicker = room?.picker_id === playerId
  const hasAnswered = currentPlayer?.hasAnswered || false

  // Get categories from board
  const categories = room?.board
    ? [...new Set(room.board.map(q => q.category))]
    : []

  // Current question (classic mode - from board)
  const currentQuestion = room?.current_question
    ? room.board?.[room.current_question.index]
    : null

  // Quick mode current question (from questions array)
  const quickCurrentQuestion = room?.game_mode === 'quick' && room?.current_question
    ? room.questions?.[room.current_question.index]
    : null

  // Effective current question (works for both modes)
  const effectiveCurrentQuestion = room?.game_mode === 'quick'
    ? quickCurrentQuestion
    : currentQuestion

  // Current player's wager info
  const currentWager = currentPlayer?.currentWager ?? null
  const wagerLocked = currentPlayer?.wagerLocked ?? false
  const availableBoxes = currentPlayer?.availableBoxes ?? []

  // All wagers (for display)
  const playerWagers = room?.players?.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score || 0,
    wager: p.currentWager,
    locked: p.wagerLocked
  })) ?? []

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION)

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

      if (remaining === 0 && isHost) {
        revealAnswers()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [room?.phase, room?.current_question?.started_at, isHost])

  // End round early when all players have answered
  useEffect(() => {
    if (room?.phase !== 'answering' || !isHost) return
    if (!room?.players || room.players.length === 0) return

    const allAnswered = room.players.every(p => p.hasAnswered)
    if (allAnswered) {
      // Small delay to allow UI to show "all answered" state before revealing
      const timeout = setTimeout(() => {
        revealAnswers()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [room?.phase, room?.players, isHost])

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
            if (payload.old?.phase !== 'ended' && payload.new.phase === 'ended') {
              incrementGamesPlayed()
            }
            // Preserve questions/board from current state if not in payload
            // (Supabase realtime may not send large JSONB fields)
            setRoom(prev => ({
              ...payload.new,
              questions: payload.new.questions || prev?.questions || [],
              board: payload.new.board || prev?.board || []
            }))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [room?.code, incrementGamesPlayed])

  // Try to rejoin
  const tryRejoin = useCallback(async () => {
    const urlCode = getRoomCodeFromURL()
    const savedCode = getSavedRoomCode()
    const code = urlCode || savedCode
    const sessionToken = getSessionTokenFromURL()

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
        updateURLWithSessionToken(null)
        return null
      }

      // Try session token match first (works even with new playerId)
      let existingPlayer = null
      if (sessionToken) {
        existingPlayer = existingRoom.players.find(p => p.sessionToken === sessionToken)
      }

      // Fall back to playerId match
      if (!existingPlayer) {
        existingPlayer = existingRoom.players.find(p => p.id === playerId)
      }

      if (existingPlayer) {
        // Update player's ID if rejoining via session token with different browser
        if (existingPlayer.id !== playerId) {
          const updatedPlayers = existingRoom.players.map(p =>
            p.sessionToken === sessionToken ? { ...p, id: playerId } : p
          )

          // Also update host_id and picker_id if needed
          const updates = { players: updatedPlayers }
          if (existingRoom.host_id === existingPlayer.id) {
            updates.host_id = playerId
          }
          if (existingRoom.picker_id === existingPlayer.id) {
            updates.picker_id = playerId
          }

          const { error: updateError } = await supabaseGames
            .from('quiz_rooms')
            .update(updates)
            .eq('code', code)

          if (updateError) {
            console.error('Failed to update player ID:', updateError)
            // Continue anyway - realtime will sync eventually
          }

          // Use updated room data
          const updatedRoom = {
            ...existingRoom,
            players: updatedPlayers,
            host_id: updates.host_id || existingRoom.host_id,
            picker_id: updates.picker_id || existingRoom.picker_id
          }

          saveRoomCode(updatedRoom.code)
          updateURLWithRoomCode(updatedRoom.code)
          updateURLWithSessionToken(existingPlayer.sessionToken)
          setRoom(updatedRoom)
          return updatedRoom
        }

        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)
        updateURLWithSessionToken(existingPlayer.sessionToken)
        setRoom(existingRoom)
        return existingRoom
      }

      // URL has room code but player not in room - prompt to join
      if (urlCode) {
        return { code: urlCode, needsJoin: true }
      }

      saveRoomCode(null)
      return null
    } catch (err) {
      saveRoomCode(null)
      updateURLWithRoomCode(null)
      updateURLWithSessionToken(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

  // Create a new room with default settings
  // Room starts with unnamed host, default game_mode='quick', default theme={id:'mixed',name:'Mixed'}
  // Questions/board are built at startGame() time, not create time
  const createRoom = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const code = generateRoomCode()
      const sessionToken = generateSessionToken()

      const newRoom = {
        code,
        phase: 'lobby',
        game_mode: 'quick',
        theme: { id: 'mixed', name: 'Mixed' },
        players: [{
          id: playerId,
          name: '', // Start with empty name - user sets it in lobby
          sessionToken,
          score: 0,
          hasAnswered: false,
          correctCount: 0,
          totalTime: 0,
          answerCount: 0,
          // Quick mode specific (default mode)
          availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          currentWager: null,
          wagerLocked: false
        }],
        host_id: playerId,
        picker_id: playerId,
        // Questions/board built at startGame() time
        board: [],
        questions: [],
        round_number: 0,
        current_question: null
      }

      const { data, error: supabaseError } = await supabaseGames
        .from('quiz_rooms')
        .insert(newRoom)
        .select()
        .single()

      if (supabaseError) throw supabaseError

      saveRoomCode(data.code)
      updateURLWithRoomCode(data.code)
      updateURLWithSessionToken(sessionToken)

      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId])

  // Join room - player name set in lobby via setPlayerName()
  const joinRoom = useCallback(async (code) => {
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

      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)
        setRoom(existingRoom)
        return existingRoom
      }

      const sessionToken = generateSessionToken()
      const isQuickMode = existingRoom.game_mode === 'quick'
      // Use saved profile name if available, otherwise empty string (set in lobby)
      const initialName = profile.name || ''
      const updatedPlayers = [
        ...existingRoom.players,
        {
          id: playerId,
          name: initialName,
          sessionToken,
          score: 0,
          hasAnswered: false,
          correctCount: 0,
          totalTime: 0,
          answerCount: 0,
          // Quick mode specific
          ...(isQuickMode && {
            availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            currentWager: null,
            wagerLocked: false
          })
        }
      ]

      const { data, error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase())
        .select()
        .single()

      if (updateError) throw updateError

      saveRoomCode(data.code)
      updateURLWithRoomCode(data.code)
      const myPlayer = data.players.find(p => p.id === playerId)
      if (myPlayer?.sessionToken) {
        updateURLWithSessionToken(myPlayer.sessionToken)
      }

      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId, profile.name])

  // Set player name in lobby
  const setPlayerName = useCallback(async (name) => {
    if (!room) return
    const trimmedName = name.trim()
    if (!trimmedName) return

    // Update player's name in room.players array
    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, name: trimmedName } : p
    )

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) {
      setError(updateError.message)
    } else {
      // Also save to localStorage via UserContext
      updateName(trimmedName)
    }
  }, [room, playerId, updateName])

  // Set game mode (host only, lobby phase only)
  const setGameMode = useCallback(async (mode) => {
    if (!room || !isHost || room.phase !== 'lobby') return
    if (mode !== 'quick' && mode !== 'classic') return

    // When switching modes, update player fields accordingly
    const updatedPlayers = room.players.map(p => {
      if (mode === 'quick') {
        // Add quick mode fields
        return {
          ...p,
          availableBoxes: p.availableBoxes || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          currentWager: p.currentWager ?? null,
          wagerLocked: p.wagerLocked ?? false
        }
      } else {
        // Remove quick mode fields for classic mode
        const { availableBoxes, currentWager, wagerLocked, ...rest } = p
        return rest
      }
    })

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({
        game_mode: mode,
        players: updatedPlayers,
        round_number: mode === 'quick' ? 0 : null
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Set category/theme (host only, lobby phase only)
  const setCategory = useCallback(async (category) => {
    if (!room || !isHost || room.phase !== 'lobby') return
    if (!category || !category.id || !category.name) return

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ theme: { id: category.id, name: category.name } })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Start game
  const startGame = useCallback(async () => {
    if (!room || !isHost || room.phase !== 'lobby') return

    // Validate all players have names
    if (room.players.some(p => !p.name?.trim())) {
      setError('All players must enter their name before starting')
      return
    }

    if (room.players.length < 2) {
      setError('Need at least 2 players to start')
      return
    }

    // Fetch fresh room data to ensure we have latest state
    const { data: freshRoom, error: fetchError } = await supabaseGames
      .from('quiz_rooms')
      .select()
      .eq('code', room.code)
      .single()

    if (fetchError || !freshRoom) {
      setError('Failed to load room data')
      return
    }

    // Re-validate names on fresh data
    if (freshRoom.players.some(p => !p.name?.trim())) {
      setError('All players must enter their name before starting')
      return
    }

    const isQuickMode = freshRoom.game_mode === 'quick'

    // Build questions/board at start time (not create time)
    let board = []
    let questions = []

    try {
      if (isQuickMode) {
        // Quick mode: 10 random open-ended questions
        questions = getRandomQuestions(10)
        if (!questions || questions.length === 0) {
          setError('Failed to load questions. Please try again.')
          return
        }
      } else {
        // Classic mode: 5x5 board (25 questions)
        const result = buildBoard()
        board = result.board
        if (!board || board.length === 0) {
          setError('Failed to load questions. Please try again.')
          return
        }
      }
    } catch (err) {
      setError('Failed to load questions. Please try again.')
      return
    }

    if (isQuickMode) {
      // Quick mode: start round 1 wagering
      const question = questions[0]

      const updatedPlayers = freshRoom.players.map(p => ({
        ...p,
        currentWager: null,
        wagerLocked: false,
        hasAnswered: false,
        // Ensure quick mode fields are present
        availableBoxes: p.availableBoxes || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }))

      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'wagering',
          round_number: 1,
          players: updatedPlayers,
          questions: questions,
          board: [],
          current_question: {
            index: 0,
            category: question.category,
            started_at: null,
            submissions: []
          }
        })
        .eq('code', freshRoom.code)

      if (!updateError) {
        incrementGamesHosted()
      } else {
        setError(updateError.message)
      }
    } else {
      // Classic mode: go to picking phase
      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'picking',
          board: board,
          questions: []
        })
        .eq('code', freshRoom.code)

      if (!updateError) {
        incrementGamesHosted()
      } else {
        setError(updateError.message)
      }
    }
  }, [room, isHost, incrementGamesHosted])

  // Select a wager box (quick mode)
  const selectWager = useCallback(async (boxNumber) => {
    if (!room || room.phase !== 'wagering' || room.game_mode !== 'quick') return

    const player = room.players.find(p => p.id === playerId)
    if (!player || !player.availableBoxes?.includes(boxNumber)) return
    if (player.wagerLocked) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, currentWager: boxNumber } : p
    )

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: updatedPlayers })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, playerId])

  // Lock in wager (quick mode)
  const lockWager = useCallback(async () => {
    if (!room || room.phase !== 'wagering' || room.game_mode !== 'quick') return

    const player = room.players.find(p => p.id === playerId)
    if (!player || player.currentWager === null || player.wagerLocked) return

    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, wagerLocked: true } : p
    )

    // Check if all players have locked in
    const allLocked = updatedPlayers.every(p => p.wagerLocked)

    const updates = { players: updatedPlayers }

    if (allLocked) {
      // Transition to answering phase
      updates.phase = 'answering'
      updates.current_question = {
        ...room.current_question,
        started_at: new Date().toISOString()
      }
    }

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update(updates)
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, playerId])

  // Select question
  const selectQuestion = useCallback(async (questionIndex) => {
    if (!room || !isPicker || room.phase !== 'picking') return

    const question = room.board[questionIndex]
    if (!question || question.used) {
      setError('Invalid question selection')
      return
    }

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

  // Submit answer
  const submitAnswer = useCallback(async (answer) => {
    if (!room || room.phase !== 'answering' || hasAnswered) return

    const submission = {
      player_id: playerId,
      answer: answer.trim(),
      submitted_at: new Date().toISOString(),
      correct: null
    }

    const currentSubmissions = room.current_question?.submissions || []
    const updatedSubmissions = [...currentSubmissions, submission]

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

  // Reveal answers
  const revealAnswers = useCallback(async () => {
    if (!room || room.phase !== 'answering') return

    const isQuickMode = room.game_mode === 'quick'
    const question = isQuickMode
      ? room.questions[room.current_question.index]
      : room.board[room.current_question.index]

    const submissions = room.current_question.submissions || []

    const evaluatedSubmissions = submissions.map(s => {
      // All questions now use acceptable_answers array
      const acceptableAnswers = question.acceptable_answers || [question.answer]
      const isCorrect = checkAnswer(s.answer, acceptableAnswers)

      const startTime = new Date(room.current_question.started_at).getTime()
      const submitTime = new Date(s.submitted_at).getTime()
      const responseTime = (submitTime - startTime) / 1000

      return { ...s, correct: isCorrect, responseTime }
    })

    let updatedPlayers
    let updatedBoard = room.board
    let nextPickerId = room.picker_id

    let quickModePointsAwarded = []

    if (isQuickMode) {
      // Quick mode: score based on wager, remove used box
      updatedPlayers = room.players.map(p => {
        const submission = evaluatedSubmissions.find(s => s.player_id === p.id)
        const wager = p.currentWager || 0
        const pointsEarned = submission?.correct ? wager : 0

        // Track points for display
        quickModePointsAwarded.push({
          player_id: p.id,
          points: pointsEarned
        })

        return {
          ...p,
          score: p.score + pointsEarned,
          correctCount: submission?.correct ? (p.correctCount || 0) + 1 : (p.correctCount || 0),
          totalTime: (p.totalTime || 0) + (submission?.responseTime || 0),
          answerCount: (p.answerCount || 0) + 1,
          // Remove used box
          availableBoxes: p.availableBoxes.filter(b => b !== p.currentWager)
        }
      })
    } else {
      // Classic mode: first correct answer gets full points, others get half
      const correctSubmissions = evaluatedSubmissions
        .filter(s => s.correct)
        .sort((a, b) => a.responseTime - b.responseTime)

      const classicPointsAwarded = []

      updatedPlayers = room.players.map(p => {
        const submission = evaluatedSubmissions.find(s => s.player_id === p.id)
        if (!submission) return p

        let pointsEarned = 0
        if (submission.correct) {
          const rank = correctSubmissions.findIndex(s => s.player_id === p.id)
          // First correct gets full points, others get half
          pointsEarned = rank === 0 ? question.value : Math.floor(question.value / 2)
        }

        classicPointsAwarded.push({ player_id: p.id, points: pointsEarned })

        return {
          ...p,
          score: p.score + pointsEarned,
          correctCount: submission.correct ? (p.correctCount || 0) + 1 : (p.correctCount || 0),
          totalTime: (p.totalTime || 0) + (submission.responseTime || 0),
          answerCount: (p.answerCount || 0) + 1
        }
      })

      updatedBoard = room.board.map((q, i) =>
        i === room.current_question.index ? { ...q, used: true } : q
      )

      // Fastest correct answer becomes next picker
      if (correctSubmissions.length > 0) {
        nextPickerId = correctSubmissions[0].player_id
      }

      quickModePointsAwarded = classicPointsAwarded // Reuse for display
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
          points_awarded: quickModePointsAwarded
        }
      })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room])

  // Continue game
  const continueGame = useCallback(async () => {
    if (!room || room.phase !== 'reveal') return

    const isQuickMode = room.game_mode === 'quick'

    if (isQuickMode) {
      // Quick mode: check if more rounds
      if (room.round_number >= 10) {
        const { error: updateError } = await supabaseGames
          .from('quiz_rooms')
          .update({ phase: 'ended', current_question: null })
          .eq('code', room.code)
        if (updateError) setError(updateError.message)
      } else {
        // Start next round (wagering phase)
        const nextRound = room.round_number + 1
        const question = room.questions[nextRound - 1]

        const updatedPlayers = room.players.map(p => ({
          ...p,
          currentWager: null,
          wagerLocked: false,
          hasAnswered: false
        }))

        const { error: updateError } = await supabaseGames
          .from('quiz_rooms')
          .update({
            phase: 'wagering',
            round_number: nextRound,
            players: updatedPlayers,
            current_question: {
              index: nextRound - 1,
              category: question.category,
              started_at: null,
              submissions: []
            }
          })
          .eq('code', room.code)
        if (updateError) setError(updateError.message)
      }
    } else {
      // Classic mode: check remaining questions
      const remainingQ = room.board.filter(q => !q.used).length

      if (remainingQ === 0) {
        const { error: updateError } = await supabaseGames
          .from('quiz_rooms')
          .update({ phase: 'ended', current_question: null })
          .eq('code', room.code)
        if (updateError) setError(updateError.message)
      } else {
        const { error: updateError } = await supabaseGames
          .from('quiz_rooms')
          .update({ phase: 'picking', current_question: null })
          .eq('code', room.code)
        if (updateError) setError(updateError.message)
      }
    }
  }, [room])

  // End game early
  const endGameEarly = useCallback(async () => {
    if (!room || !isHost) return

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ phase: 'ended', current_question: null })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Play again
  const playAgain = useCallback(async () => {
    if (!room || !isHost) return

    setLoading(true)
    try {
      const isQuickMode = room.game_mode === 'quick'

      // Build fresh questions/board
      let board = []
      let questions = []

      if (isQuickMode) {
        questions = getRandomQuestions(10)
      } else {
        const result = buildBoard()
        board = result.board
      }

      const resetPlayers = room.players.map(p => ({
        ...p,
        score: 0,
        hasAnswered: false,
        correctCount: 0,
        totalTime: 0,
        answerCount: 0,
        // Reset quick mode fields
        ...(isQuickMode && {
          availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          currentWager: null,
          wagerLocked: false
        })
      }))

      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'lobby',
          players: resetPlayers,
          board: isQuickMode ? [] : board,
          questions: isQuickMode ? questions : [],
          round_number: isQuickMode ? 0 : null,
          picker_id: room.host_id,
          current_question: null
        })
        .eq('code', room.code)

      if (updateError) setError(updateError.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [room, isHost])

  // Leave room
  const leaveRoom = useCallback(() => {
    saveRoomCode(null)
    updateURLWithRoomCode(null)
    updateURLWithSessionToken(null)
    setRoom(null)
    setError(null)
  }, [])

  // Add bot
  const addBot = useCallback(async () => {
    if (!room || !isHost || room.phase !== 'lobby') return

    const usedNames = room.players.map(p => p.name)
    const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n))
    const botName = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Bot ${room.players.length + 1}`

    const isQuickMode = room.game_mode === 'quick'
    const botPlayer = {
      id: generateBotId(),
      name: botName,
      score: 0,
      hasAnswered: false,
      isBot: true,
      correctCount: 0,
      totalTime: 0,
      answerCount: 0,
      ...(isQuickMode && {
        availableBoxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currentWager: null,
        wagerLocked: false
      })
    }

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: [...room.players, botPlayer] })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Remove bot
  const removeBot = useCallback(async (botId) => {
    if (!room || !isHost || room.phase !== 'lobby') return

    const { error: updateError } = await supabaseGames
      .from('quiz_rooms')
      .update({ players: room.players.filter(p => p.id !== botId) })
      .eq('code', room.code)

    if (updateError) setError(updateError.message)
  }, [room, isHost])

  // Simple bot behavior for testing
  useEffect(() => {
    if (!room || !isHost) return

    const bots = room.players.filter(p => p.isBot)
    if (bots.length === 0) return

    // Bot wagers (quick mode)
    if (room.phase === 'wagering' && room.game_mode === 'quick') {
      const unlockedBots = bots.filter(b => !b.wagerLocked)
      if (unlockedBots.length === 0) return

      const timeout = setTimeout(async () => {
        // All bots wager at once
        const updatedPlayers = room.players.map(p => {
          if (!p.isBot || p.wagerLocked) return p
          const boxes = p.availableBoxes || []
          if (boxes.length === 0) return p
          const wager = boxes[Math.floor(Math.random() * boxes.length)]
          return { ...p, currentWager: wager, wagerLocked: true }
        })

        const allLocked = updatedPlayers.every(p => p.wagerLocked)
        const updates = { players: updatedPlayers }

        if (allLocked) {
          updates.phase = 'answering'
          updates.current_question = {
            ...room.current_question,
            started_at: new Date().toISOString()
          }
        }

        await supabaseGames
          .from('quiz_rooms')
          .update(updates)
          .eq('code', room.code)
      }, 1000)
      return () => clearTimeout(timeout)
    }

    // Bot answers
    if (room.phase === 'answering' && room.current_question) {
      const unansweredBots = bots.filter(b => !b.hasAnswered)
      if (unansweredBots.length === 0) return

      const isQuickMode = room.game_mode === 'quick'
      const question = isQuickMode
        ? room.questions?.[room.current_question.index]
        : room.board?.[room.current_question.index]

      if (!question) return

      const timeout = setTimeout(async () => {
        const subs = room.current_question?.submissions || []
        const newSubs = []

        const updatedPlayers = room.players.map(p => {
          if (!p.isBot || p.hasAnswered) return p

          // Pick answer based on question type
          let answer
          const isCorrect = Math.random() < 0.7

          if (question.type === 'open') {
            // Open-ended: pick from acceptable_answers or use answer
            const correctAnswers = question.acceptable_answers || [question.answer]
            answer = isCorrect
              ? correctAnswers[Math.floor(Math.random() * correctAnswers.length)]
              : 'Wrong answer'
          } else {
            // Multiple choice
            answer = isCorrect ? question.answer : (question.options?.[0] || 'Wrong')
          }

          newSubs.push({
            player_id: p.id,
            answer,
            submitted_at: new Date().toISOString(),
            correct: null
          })
          return { ...p, hasAnswered: true }
        })

        await supabaseGames
          .from('quiz_rooms')
          .update({
            players: updatedPlayers,
            current_question: {
              ...room.current_question,
              submissions: [...subs, ...newSubs]
            }
          })
          .eq('code', room.code)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [room?.phase, room?.current_question?.index, room?.code, isHost])

  const sortedPlayers = room?.players
    ? [...room.players].sort((a, b) => b.score - a.score)
    : []

  const remainingQuestions = room?.board
    ? room.board.filter(q => !q.used).length
    : 0

  // Check if all players have non-empty names
  const allPlayersNamed = room?.players?.every(p => p.name && p.name.trim()) ?? false

  return {
    room,
    loading,
    error,
    playerId,
    currentPlayer,
    isHost,
    isPicker,
    hasAnswered,
    categories,
    currentQuestion: effectiveCurrentQuestion,
    timeRemaining,
    sortedPlayers,
    remainingQuestions,
    savedName: profile.name,
    allPlayersNamed,
    // Quick mode specific
    currentWager,
    wagerLocked,
    availableBoxes,
    playerWagers,
    roundNumber: room?.round_number ?? 0,
    // Actions
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    startGame,
    setPlayerName,
    setGameMode,
    setCategory,
    selectWager,
    lockWager,
    addBot,
    removeBot,
    selectQuestion,
    submitAnswer,
    revealAnswers,
    continueGame,
    endGameEarly,
    playAgain
  }
}
