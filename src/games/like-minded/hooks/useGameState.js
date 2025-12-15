import { useState, useCallback } from 'react'
import { getRandomSpectrum } from '../data/spectrums'

// Calculate score based on distance from target
export function calculateScore(targetPosition, guessPosition) {
  const distance = Math.abs(targetPosition - guessPosition)

  if (distance <= 5) {
    return { playerPoints: 4, gamePoints: 0, zone: 'bullseye' }
  }
  if (distance <= 12) {
    return { playerPoints: 3, gamePoints: 0, zone: 'close' }
  }
  if (distance <= 20) {
    return { playerPoints: 2, gamePoints: 0, zone: 'near' }
  }

  // Game gets points based on how far off
  const gamePoints = Math.min(4, Math.ceil(distance / 20))
  return { playerPoints: 0, gamePoints, zone: 'miss' }
}

// Initial game state
const initialState = {
  phase: 'setup', // 'setup' | 'psychic' | 'guess' | 'reveal' | 'results'
  players: [],
  currentPsychicIndex: 0,
  playerScore: 0,
  gameScore: 0,
  currentRound: {
    spectrum: null,
    targetPosition: 0,
    clue: '',
    guessPosition: 50,
    result: null
  },
  usedSpectrumIds: [],
  roundHistory: []
}

export function useGameState() {
  const [state, setState] = useState(initialState)

  // Start a new game with player names
  const startGame = useCallback((playerNames) => {
    const spectrum = getRandomSpectrum([])
    const targetPosition = Math.floor(Math.random() * 101) // 0-100

    setState({
      ...initialState,
      phase: 'psychic',
      players: playerNames.map((name, index) => ({
        id: `player-${index}`,
        name: name || `Player ${index + 1}`
      })),
      currentRound: {
        spectrum,
        targetPosition,
        clue: '',
        guessPosition: 50,
        result: null
      },
      usedSpectrumIds: [spectrum.id]
    })
  }, [])

  // Current psychic submits their clue
  const submitClue = useCallback((clue) => {
    setState(prev => ({
      ...prev,
      phase: 'guess',
      currentRound: {
        ...prev.currentRound,
        clue
      }
    }))
  }, [])

  // Update guess position (while dragging slider)
  const updateGuess = useCallback((position) => {
    setState(prev => ({
      ...prev,
      currentRound: {
        ...prev.currentRound,
        guessPosition: position
      }
    }))
  }, [])

  // Lock in the guess and reveal
  const lockInGuess = useCallback(() => {
    setState(prev => {
      const result = calculateScore(
        prev.currentRound.targetPosition,
        prev.currentRound.guessPosition
      )

      return {
        ...prev,
        phase: 'reveal',
        currentRound: {
          ...prev.currentRound,
          result
        }
      }
    })
  }, [])

  // Finish reveal and update scores
  const finishReveal = useCallback(() => {
    setState(prev => {
      const { result, spectrum, targetPosition, clue, guessPosition } = prev.currentRound
      const newPlayerScore = prev.playerScore + result.playerPoints
      const newGameScore = prev.gameScore + result.gamePoints
      const nextPsychicIndex = prev.currentPsychicIndex + 1

      // Add to history
      const roundEntry = {
        psychic: prev.players[prev.currentPsychicIndex].name,
        spectrum,
        targetPosition,
        clue,
        guessPosition,
        result
      }

      // Check if game is over (all players have been psychic)
      if (nextPsychicIndex >= prev.players.length) {
        return {
          ...prev,
          phase: 'results',
          playerScore: newPlayerScore,
          gameScore: newGameScore,
          roundHistory: [...prev.roundHistory, roundEntry]
        }
      }

      // Start next round
      const newSpectrum = getRandomSpectrum(prev.usedSpectrumIds)
      const newTarget = Math.floor(Math.random() * 101)

      return {
        ...prev,
        phase: 'psychic',
        currentPsychicIndex: nextPsychicIndex,
        playerScore: newPlayerScore,
        gameScore: newGameScore,
        currentRound: {
          spectrum: newSpectrum,
          targetPosition: newTarget,
          clue: '',
          guessPosition: 50,
          result: null
        },
        usedSpectrumIds: [...prev.usedSpectrumIds, newSpectrum.id],
        roundHistory: [...prev.roundHistory, roundEntry]
      }
    })
  }, [])

  // Play again with same players
  const playAgain = useCallback(() => {
    setState(prev => {
      const spectrum = getRandomSpectrum([])
      const targetPosition = Math.floor(Math.random() * 101)

      return {
        ...initialState,
        phase: 'psychic',
        players: prev.players,
        currentRound: {
          spectrum,
          targetPosition,
          clue: '',
          guessPosition: 50,
          result: null
        },
        usedSpectrumIds: [spectrum.id]
      }
    })
  }, [])

  // Reset to setup
  const resetGame = useCallback(() => {
    setState(initialState)
  }, [])

  // Get current psychic
  const currentPsychic = state.players[state.currentPsychicIndex]

  return {
    ...state,
    currentPsychic,
    startGame,
    submitClue,
    updateGuess,
    lockInGuess,
    finishReveal,
    playAgain,
    resetGame
  }
}
