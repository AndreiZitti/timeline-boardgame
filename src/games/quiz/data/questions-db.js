// Database-backed questions for Quiz game
// Uses Supabase to store questions with like/dislike tracking

import { supabaseGames } from '@/lib/supabase/client'

// All available categories
export const ALL_CATEGORIES = [
  { id: 9, name: 'General Knowledge', short: 'General' },
  { id: 10, name: 'Entertainment: Books', short: 'Books' },
  { id: 11, name: 'Entertainment: Film', short: 'Film' },
  { id: 12, name: 'Entertainment: Music', short: 'Music' },
  { id: 13, name: 'Entertainment: Musicals & Theatres', short: 'Musicals' },
  { id: 14, name: 'Entertainment: Television', short: 'TV' },
  { id: 15, name: 'Entertainment: Video Games', short: 'Video Games' },
  { id: 16, name: 'Entertainment: Board Games', short: 'Board Games' },
  { id: 17, name: 'Science & Nature', short: 'Science' },
  { id: 18, name: 'Science: Computers', short: 'Computers' },
  { id: 19, name: 'Science: Mathematics', short: 'Math' },
  { id: 20, name: 'Mythology', short: 'Mythology' },
  { id: 21, name: 'Sports', short: 'Sports' },
  { id: 22, name: 'Geography', short: 'Geography' },
  { id: 23, name: 'History', short: 'History' },
  { id: 24, name: 'Politics', short: 'Politics' },
  { id: 25, name: 'Art', short: 'Art' },
  { id: 26, name: 'Celebrities', short: 'Celebrities' },
  { id: 27, name: 'Animals', short: 'Animals' },
  { id: 28, name: 'Vehicles', short: 'Vehicles' },
  { id: 29, name: 'Entertainment: Comics', short: 'Comics' },
  { id: 30, name: 'Science: Gadgets', short: 'Gadgets' },
  { id: 31, name: 'Entertainment: Japanese Anime & Manga', short: 'Anime' },
  { id: 32, name: 'Entertainment: Cartoon & Animations', short: 'Cartoons' }
]

// Get category short name
export function getCategoryShortName(categoryId) {
  return ALL_CATEGORIES.find(c => c.id === categoryId)?.short || 'Unknown'
}

// Shuffle array
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Fetch a board of questions from the database
 * @param {Object} options
 * @param {number[]} options.categoryIds - Array of category IDs to include (default: random 6)
 * @param {string} options.type - 'multiple', 'boolean', or 'any' (default: 'any')
 * @param {number} options.minQuality - Minimum (likes - dislikes) score (default: -5)
 * @returns {Promise<{board: Array, categories: string[]}>}
 */
export async function fetchBoardFromDB(options = {}) {
  const {
    categoryIds = null, // null = random 6
    type = 'any',
    minQuality = -5
  } = options

  // Select 6 random categories if not specified
  let selectedCategories
  if (categoryIds && categoryIds.length >= 6) {
    selectedCategories = categoryIds.slice(0, 6)
  } else {
    const shuffled = shuffleArray(ALL_CATEGORIES)
    selectedCategories = shuffled.slice(0, 6).map(c => c.id)
  }

  const board = []
  const categories = []
  const questionIds = []

  // Fetch 5 questions per category (one for each point value)
  // Sort by quality (likes - dislikes) and randomize within quality tiers
  for (const categoryId of selectedCategories) {
    const catInfo = ALL_CATEGORIES.find(c => c.id === categoryId)
    categories.push(catInfo?.short || 'Unknown')

    // Build query
    let query = supabaseGames
      .from('quiz_questions')
      .select('*')
      .eq('category_id', categoryId)
      .gte('likes', 0) // Has the columns (table exists)

    if (type !== 'any') {
      query = query.eq('type', type)
    }

    // Get more than needed so we can randomize
    const { data: questions, error } = await query
      .order('likes', { ascending: false })
      .limit(50)

    if (error) {
      console.error(`Error fetching questions for category ${categoryId}:`, error)
      // Add placeholder questions
      for (let i = 0; i < 5; i++) {
        board.push(createPlaceholderQuestion(board.length, catInfo?.short || 'Unknown', [100, 200, 300, 400, 500][i]))
      }
      continue
    }

    // Filter by quality
    const goodQuestions = questions.filter(q => (q.likes - q.dislikes) >= minQuality)
    
    // Separate by difficulty for point value assignment
    const easy = shuffleArray(goodQuestions.filter(q => q.difficulty === 'easy'))
    const medium = shuffleArray(goodQuestions.filter(q => q.difficulty === 'medium'))
    const hard = shuffleArray(goodQuestions.filter(q => q.difficulty === 'hard'))
    
    // Assign questions to point values
    // 100, 200 = easy; 300 = medium; 400, 500 = hard
    const selected = []
    
    // 100 points - easy
    selected.push(easy[0] || medium[0] || hard[0] || null)
    // 200 points - easy
    selected.push(easy[1] || medium[1] || hard[1] || null)
    // 300 points - medium
    selected.push(medium[0] || easy[2] || hard[2] || null)
    // 400 points - hard
    selected.push(hard[0] || medium[2] || easy[3] || null)
    // 500 points - hard
    selected.push(hard[1] || medium[3] || easy[4] || null)

    const values = [100, 200, 300, 400, 500]
    for (let i = 0; i < 5; i++) {
      const q = selected[i]
      if (q) {
        questionIds.push(q.id)
        board.push({
          index: board.length,
          id: q.id, // Database ID for voting
          category: catInfo?.short || q.category,
          value: values[i],
          question: q.question,
          answer: q.correct_answer,
          alternates: [],
          used: false,
          type: q.type,
          options: q.type === 'boolean'
            ? ['True', 'False']
            : shuffleArray([q.correct_answer, ...q.incorrect_answers]),
          difficulty: q.difficulty,
          likes: q.likes,
          dislikes: q.dislikes
        })
      } else {
        board.push(createPlaceholderQuestion(board.length, catInfo?.short || 'Unknown', values[i]))
      }
    }
  }

  // Increment times_shown for all selected questions
  if (questionIds.length > 0) {
    try {
      await supabaseGames.rpc('increment_question_shown', { question_ids: questionIds })
    } catch (e) {
      console.warn('Could not increment times_shown:', e)
    }
  }

  return { board, categories }
}

// Create a placeholder question when DB is empty
function createPlaceholderQuestion(index, category, value) {
  return {
    index,
    id: null,
    category,
    value,
    question: 'Question not available - please run the fetch script',
    answer: 'N/A',
    alternates: [],
    used: false,
    type: 'multiple',
    options: ['N/A', 'N/A', 'N/A', 'N/A'],
    difficulty: 'medium',
    likes: 0,
    dislikes: 0
  }
}

/**
 * Vote on a question (like or dislike)
 * @param {string} questionId - Database ID of the question
 * @param {string} playerId - Player ID
 * @param {number} vote - 1 for like, -1 for dislike
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function voteOnQuestion(questionId, playerId, vote) {
  if (!questionId) return { success: false, error: 'No question ID' }
  
  const { error } = await supabaseGames
    .from('quiz_question_votes')
    .insert({
      question_id: questionId,
      player_id: playerId,
      vote
    })

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - already voted
      return { success: false, error: 'Already voted' }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check if player has already voted on a question
 * @param {string} questionId
 * @param {string} playerId
 * @returns {Promise<number|null>} 1, -1, or null if not voted
 */
export async function getPlayerVote(questionId, playerId) {
  if (!questionId) return null
  
  const { data, error } = await supabaseGames
    .from('quiz_question_votes')
    .select('vote')
    .eq('question_id', questionId)
    .eq('player_id', playerId)
    .single()

  if (error || !data) return null
  return data.vote
}

/**
 * Get question statistics
 * @returns {Promise<Object>} Stats about the question database
 */
export async function getQuestionStats() {
  const { data, error } = await supabaseGames
    .from('quiz_questions')
    .select('category_id, difficulty, type', { count: 'exact' })

  if (error) {
    return { total: 0, byCategory: {}, byDifficulty: {}, byType: {} }
  }

  const stats = {
    total: data.length,
    byCategory: {},
    byDifficulty: { easy: 0, medium: 0, hard: 0 },
    byType: { multiple: 0, boolean: 0 }
  }

  for (const q of data) {
    // By category
    const catName = getCategoryShortName(q.category_id)
    stats.byCategory[catName] = (stats.byCategory[catName] || 0) + 1
    
    // By difficulty
    stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1
    
    // By type
    stats.byType[q.type] = (stats.byType[q.type] || 0) + 1
  }

  return stats
}
