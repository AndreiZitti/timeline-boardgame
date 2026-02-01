import seedrandom from 'seedrandom'

/**
 * Creates a seeded random number generator
 * @param {string} seed - The seed string
 * @returns {function} - Random number generator function (0-1)
 */
export function createSeededRandom(seed) {
  return seedrandom(seed)
}

/**
 * Assigns unique random numbers (1-100) to players based on room code and round
 * @param {Array} players - Array of player objects
 * @param {string} roomCode - The room code
 * @param {number} round - The current round number
 * @returns {Array} - Players with assigned numbers
 */
export function assignNumbers(players, roomCode, round) {
  const seed = `${roomCode}-${round}`
  const rng = createSeededRandom(seed)

  // Generate unique numbers for each player
  const numbers = []
  while (numbers.length < players.length) {
    const num = Math.floor(rng() * 100) + 1 // 1-100
    if (!numbers.includes(num)) {
      numbers.push(num)
    }
  }

  // Assign to players
  return players.map((player, i) => ({
    ...player,
    number: numbers[i],
    hidden: false,
    confirmed: false
  }))
}

/**
 * Generates a random room code (5 characters: 4 letters + 1 digit)
 * @returns {string} - Room code like "DUCK7"
 */
export function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Excluding I and O to avoid confusion
  const digits = '0123456789'

  let code = ''
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }
  code += digits[Math.floor(Math.random() * digits.length)]

  return code
}

/**
 * Generate a short 4-character room code (letters only, no confusing chars)
 * Used for score tracker live view links
 * @returns {string} - Room code like "ABCD"
 */
export function generateShortCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ' // No I, L, O (confusing)
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
