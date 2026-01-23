// Fuzzy answer matching for quiz game

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Normalize a string for comparison
 * - lowercase
 * - trim whitespace
 * - remove articles (the, a, an)
 * - remove punctuation
 * - normalize whitespace
 */
function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, '')  // Remove leading articles
    .replace(/[^\w\s]/g, '')          // Remove punctuation
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim()
}

/**
 * Check if a submitted answer matches the correct answer
 * @param {string} submitted - The player's submitted answer
 * @param {string} correct - The correct answer
 * @param {string[]} alternates - Array of acceptable alternate answers
 * @returns {boolean} - Whether the answer is correct
 */
export function isAnswerCorrect(submitted, correct, alternates = []) {
  if (!submitted || !correct) return false

  const playerAnswer = normalize(submitted)
  if (!playerAnswer) return false

  const validAnswers = [correct, ...alternates].map(normalize)

  return validAnswers.some(valid => {
    // Exact match after normalization
    if (valid === playerAnswer) return true

    // Fuzzy match - allow ~20% character errors
    const maxDistance = Math.floor(valid.length * 0.2)
    const distance = levenshteinDistance(valid, playerAnswer)

    return distance <= maxDistance
  })
}

/**
 * Calculate points for correct answers based on submission order
 * @param {Array} submissions - Array of { player_id, answer, submitted_at, correct }
 * @param {number} baseValue - The question's point value
 * @returns {Array} - Array of { player_id, points }
 */
export function calculatePoints(submissions, baseValue) {
  // Sort correct submissions by time (earliest first)
  const correctSorted = submissions
    .filter(s => s.correct)
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))

  const multipliers = [1.0, 0.75, 0.5, 0.25] // 1st, 2nd, 3rd, 4th+

  return correctSorted.map((submission, index) => ({
    player_id: submission.player_id,
    points: Math.round(baseValue * (multipliers[index] ?? 0.25))
  }))
}
