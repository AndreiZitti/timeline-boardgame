// Open Trivia Database API integration
// https://opentdb.com/

const API_BASE = 'https://opentdb.com/api.php'
const CATEGORY_API = 'https://opentdb.com/api_category.php'

// Category IDs we want to use (6 for our board)
export const SELECTED_CATEGORIES = [
  { id: 9, name: 'General Knowledge' },
  { id: 11, name: 'Film' },
  { id: 12, name: 'Music' },
  { id: 17, name: 'Science & Nature' },
  { id: 23, name: 'History' },
  { id: 22, name: 'Geography' },
]

// Difficulty to point value mapping
const DIFFICULTY_VALUES = {
  easy: [100, 200],
  medium: [300],
  hard: [400, 500]
}

// Decode URL-encoded strings from API
function decodeResponse(str) {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Fetch questions from Open Trivia DB for a specific category
 * @param {number} categoryId - The category ID
 * @param {number} amount - Number of questions to fetch
 * @param {string} difficulty - 'easy', 'medium', 'hard', or undefined for any
 * @returns {Promise<Array>} Array of questions
 */
async function fetchQuestions(categoryId, amount = 5, difficulty = undefined) {
  let url = `${API_BASE}?amount=${amount}&category=${categoryId}&encode=url3986`
  if (difficulty) {
    url += `&difficulty=${difficulty}`
  }
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (data.response_code !== 0) {
    console.warn(`API returned code ${data.response_code} for category ${categoryId}`)
    return []
  }
  
  return data.results.map(q => ({
    type: q.type, // 'multiple' or 'boolean'
    difficulty: q.difficulty,
    category: decodeResponse(q.category),
    question: decodeResponse(q.question),
    correct_answer: decodeResponse(q.correct_answer),
    incorrect_answers: q.incorrect_answers.map(decodeResponse),
    // Pre-shuffle options for display
    options: q.type === 'boolean' 
      ? ['True', 'False']
      : shuffleArray([decodeResponse(q.correct_answer), ...q.incorrect_answers.map(decodeResponse)])
  }))
}

/**
 * Fetch a complete board of questions (6 categories × 5 questions each)
 * Questions are organized by difficulty to match point values
 * @returns {Promise<Object>} Board data ready for the game
 */
export async function fetchOpenTDBBoard() {
  const board = []
  const categories = []
  
  // Fetch questions for each category
  for (const cat of SELECTED_CATEGORIES) {
    categories.push(cat.name)
    
    try {
      // We need 5 questions per category with varying difficulties
      // Fetch more than needed and sort by difficulty
      const questions = await fetchQuestions(cat.id, 10)
      
      if (questions.length < 5) {
        console.warn(`Not enough questions for ${cat.name}, got ${questions.length}`)
        // Pad with what we have
        while (questions.length < 5) {
          questions.push(questions[questions.length - 1] || {
            question: 'Question unavailable',
            correct_answer: 'N/A',
            incorrect_answers: [],
            options: ['N/A'],
            type: 'multiple',
            difficulty: 'medium'
          })
        }
      }
      
      // Sort by difficulty: easy first, then medium, then hard
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
      questions.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
      
      // Take first 5 and assign point values
      const values = [100, 200, 300, 400, 500]
      for (let i = 0; i < 5; i++) {
        const q = questions[i]
        board.push({
          index: board.length,
          category: cat.name,
          value: values[i],
          question: q.question,
          answer: q.correct_answer,
          alternates: [], // Open TDB has exact answers
          used: false,
          // Additional fields for multiple choice / true-false
          type: q.type,
          options: q.options,
          difficulty: q.difficulty
        })
      }
      
      // Rate limit: wait 500ms between requests to be safe
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`Error fetching questions for ${cat.name}:`, error)
      // Add placeholder questions
      const values = [100, 200, 300, 400, 500]
      for (let i = 0; i < 5; i++) {
        board.push({
          index: board.length,
          category: cat.name,
          value: values[i],
          question: 'Question unavailable - try again',
          answer: 'N/A',
          alternates: [],
          used: false,
          type: 'multiple',
          options: ['N/A'],
          difficulty: 'medium'
        })
      }
    }
  }
  
  return { board, categories }
}

/**
 * Get all available categories from the API
 */
export async function fetchAllCategories() {
  const response = await fetch(CATEGORY_API)
  const data = await response.json()
  return data.trivia_categories
}
