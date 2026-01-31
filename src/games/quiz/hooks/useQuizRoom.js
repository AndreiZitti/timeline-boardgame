import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseGames } from '@/lib/supabase/client'
import { generateRoomCode } from '@/lib/random'
import { useUser } from '@/contexts/UserContext'
import { isAnswerCorrect, calculatePoints } from '../utils/matching'
import { buildBoardFromCache } from '../data/questions-db'

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

  // Current question
  const currentQuestion = room?.current_question
    ? room.board?.[room.current_question.index]
    : null

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
            setRoom(payload.new)
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

  // Create a new room with game mode and theme
  const createRoom = useCallback(async (hostName, gameMode, theme) => {
    setLoading(true)
    setError(null)

    try {
      // Build board from cache (instant!)
      const categoryIds = theme?.categories || null
      const { board } = buildBoardFromCache({ categoryIds })

      if (!board || board.length === 0) {
        throw new Error('Failed to load questions. Please try again.')
      }

      const code = generateRoomCode()
      const sessionToken = generateSessionToken()
      const newRoom = {
        code,
        phase: 'lobby',
        game_mode: gameMode,
        theme: { id: theme?.id || 'mixed', name: theme?.name || 'Mixed' },
        players: [{
          id: playerId,
          name: hostName,
          sessionToken,
          score: 0,
          hasAnswered: false,
          correctCount: 0,
          totalTime: 0,
          answerCount: 0
        }],
        host_id: playerId,
        picker_id: playerId,
        board,
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
      updateURLWithSessionToken(sessionToken)

      setRoom(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [playerId, updateName])

  // Join room
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

      const existingPlayer = existingRoom.players.find(p => p.id === playerId)
      if (existingPlayer) {
        updateName(playerName)
        saveRoomCode(existingRoom.code)
        updateURLWithRoomCode(existingRoom.code)
        setRoom(existingRoom)
        return existingRoom
      }

      const sessionToken = generateSessionToken()
      const updatedPlayers = [
        ...existingRoom.players,
        {
          id: playerId,
          name: playerName,
          sessionToken,
          score: 0,
          hasAnswered: false,
          correctCount: 0,
          totalTime: 0,
          answerCount: 0
        }
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
  }, [playerId, updateName])

  // Start game
  const startGame = useCallback(async () => {
    if (!room || !isHost || room.phase !== 'lobby') return

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

    const question = room.board[room.current_question.index]
    const submissions = room.current_question.submissions || []

    const evaluatedSubmissions = submissions.map(s => {
      let isCorrect
      if (question.type === 'multiple' || question.type === 'boolean') {
        isCorrect = s.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
      } else {
        isCorrect = isAnswerCorrect(s.answer, question.answer, question.alternates)
      }
      
      // Calculate response time
      const startTime = new Date(room.current_question.started_at).getTime()
      const submitTime = new Date(s.submitted_at).getTime()
      const responseTime = (submitTime - startTime) / 1000

      return { ...s, correct: isCorrect, responseTime }
    })

    const pointsAwarded = calculatePoints(evaluatedSubmissions, question.value)

    // Update player scores and stats
    const updatedPlayers = room.players.map(p => {
      const awarded = pointsAwarded.find(pa => pa.player_id === p.id)
      const submission = evaluatedSubmissions.find(s => s.player_id === p.id)
      
      if (awarded && submission) {
        return {
          ...p,
          score: p.score + awarded.points,
          correctCount: submission.correct ? (p.correctCount || 0) + 1 : (p.correctCount || 0),
          totalTime: (p.totalTime || 0) + (submission.responseTime || 0),
          answerCount: (p.answerCount || 0) + 1
        }
      }
      return p
    })

    const updatedBoard = room.board.map((q, i) =>
      i === room.current_question.index ? { ...q, used: true } : q
    )

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

  // Continue game
  const continueGame = useCallback(async () => {
    if (!room || room.phase !== 'reveal') return

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
      // Build fresh board from cache (instant!)
      const categoryIds = room.theme?.id !== 'mixed'
        ? room.board.slice(0, 6).map(q => q.category_id).filter(Boolean)
        : null
      const { board } = buildBoardFromCache({ categoryIds })

      const resetPlayers = room.players.map(p => ({
        ...p,
        score: 0,
        hasAnswered: false,
        correctCount: 0,
        totalTime: 0,
        answerCount: 0
      }))

      const { error: updateError } = await supabaseGames
        .from('quiz_rooms')
        .update({
          phase: 'lobby',
          players: resetPlayers,
          board,
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

    const botPlayer = {
      id: generateBotId(),
      name: botName,
      score: 0,
      hasAnswered: false,
      isBot: true,
      correctCount: 0,
      totalTime: 0,
      answerCount: 0
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

  // Bot behavior
  useEffect(() => {
    if (!room || !isHost) return

    const bots = room.players.filter(p => p.isBot)
    if (bots.length === 0) return

    // Bot picks
    if (room.phase === 'picking') {
      const pickerBot = bots.find(b => b.id === room.picker_id)
      if (pickerBot) {
        const delay = 1000 + Math.random() * 2000
        const timeout = setTimeout(async () => {
          const available = room.board
            .map((q, i) => ({ ...q, index: i }))
            .filter(q => !q.used)
          if (available.length > 0) {
            const pick = available[Math.floor(Math.random() * available.length)]
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

    // Bot answers
    if (room.phase === 'answering' && room.current_question) {
      const question = room.board[room.current_question.index]
      const unanswered = bots.filter(b => !b.hasAnswered)

      if (unanswered.length > 0) {
        const timeouts = unanswered.map(bot => {
          const delay = 2000 + Math.random() * 8000
          return setTimeout(async () => {
            const isCorrect = Math.random() < 0.7
            let answer
            if (question.type === 'multiple' || question.type === 'boolean') {
              if (isCorrect) {
                answer = question.answer
              } else {
                const wrong = question.options.filter(o => o !== question.answer)
                answer = wrong[Math.floor(Math.random() * wrong.length)] || question.answer
              }
            } else {
              answer = isCorrect ? question.answer : 'Wrong'
            }

            const { data: fresh } = await supabaseGames
              .from('quiz_rooms')
              .select()
              .eq('code', room.code)
              .single()

            if (fresh?.phase !== 'answering') return

            const subs = fresh.current_question?.submissions || []
            if (subs.some(s => s.player_id === bot.id)) return

            const submission = {
              player_id: bot.id,
              answer,
              submitted_at: new Date().toISOString(),
              correct: null
            }

            const updatedPlayers = fresh.players.map(p =>
              p.id === bot.id ? { ...p, hasAnswered: true } : p
            )

            await supabaseGames
              .from('quiz_rooms')
              .update({
                players: updatedPlayers,
                current_question: {
                  ...fresh.current_question,
                  submissions: [...subs, submission]
                }
              })
              .eq('code', room.code)
          }, delay)
        })
        return () => timeouts.forEach(t => clearTimeout(t))
      }
    }

    // Bot continues
    if (room.phase === 'reveal') {
      const pickerBot = bots.find(b => b.id === room.picker_id)
      if (pickerBot) {
        const delay = 3000 + Math.random() * 2000
        const timeout = setTimeout(async () => {
          const remaining = room.board.filter(q => !q.used).length
          await supabaseGames
            .from('quiz_rooms')
            .update({
              phase: remaining === 0 ? 'ended' : 'picking',
              current_question: null
            })
            .eq('code', room.code)
        }, delay)
        return () => clearTimeout(timeout)
      }
    }
  }, [room?.phase, room?.picker_id, room?.current_question?.index, room?.code, isHost])

  const sortedPlayers = room?.players
    ? [...room.players].sort((a, b) => b.score - a.score)
    : []

  const remainingQuestions = room?.board
    ? room.board.filter(q => !q.used).length
    : 0

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
    currentQuestion,
    timeRemaining,
    sortedPlayers,
    remainingQuestions,
    savedName: profile.name,
    createRoom,
    joinRoom,
    tryRejoin,
    leaveRoom,
    startGame,
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
