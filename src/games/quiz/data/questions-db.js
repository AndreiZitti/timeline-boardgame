// Database-backed questions for Quiz game
// Questions are cached on first load for instant board building

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

// Questions cache
let questionsCache = null
let cachePromise = null

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
 * Load all questions into cache (call this once on game load)
 */
export async function loadQuestionsCache() {
  // If already cached, return immediately
  if (questionsCache) {
    return { success: true, count: questionsCache.length }
  }

  // If already loading, wait for it
  if (cachePromise) {
    return cachePromise
  }

  // Start loading
  cachePromise = (async () => {
    console.log('Loading questions cache...')
    const startTime = Date.now()

    const { data: questions, error } = await supabaseGames
      .from('quiz_questions')
      .select('*')
      .gte('likes', 0)
      .order('likes', { ascending: false })

    if (error) {
      console.error('Failed to load questions:', error)
      cachePromise = null
      return { success: false, error: error.message }
    }

    questionsCache = questions || []
    const elapsed = Date.now() - startTime
    console.log(`Loaded ${questionsCache.length} questions in ${elapsed}ms`)

    return { success: true, count: questionsCache.length }
  })()

  return cachePromise
}

/**
 * Check if cache is loaded
 */
export function isCacheLoaded() {
  return questionsCache !== null
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  if (questionsCache) {
    return { loaded: true, count: questionsCache.length }
  }
  if (cachePromise) {
    return { loaded: false, loading: true }
  }
  return { loaded: false, loading: false }
}

/**
 * Build a board from cached questions (instant!)
 */
export function buildBoardFromCache(options = {}) {
  if (!questionsCache || questionsCache.length === 0) {
    console.error('Questions cache not loaded!')
    return { board: [], categories: [] }
  }

  const {
    categoryIds = null,
    difficulties = ['easy', 'medium', 'hard'],
    types = ['multiple', 'boolean'],
    minQuality = -5
  } = options

  // Filter questions by type and quality
  let filtered = questionsCache.filter(q => 
    types.includes(q.type) && 
    (q.likes - q.dislikes) >= minQuality
  )

  // Get available category IDs from filtered questions
  const availableCategoryIds = [...new Set(filtered.map(q => q.category_id))]

  // Select 6 categories
  let selectedCategories
  if (categoryIds && categoryIds.length > 0) {
    // Use provided categories that are available
    const validCategories = categoryIds.filter(id => availableCategoryIds.includes(id))
    const shuffled = shuffleArray(validCategories)
    selectedCategories = shuffled.slice(0, 6)
    
    // If not enough, fill with random available categories
    if (selectedCategories.length < 6) {
      const remaining = availableCategoryIds.filter(id => !selectedCategories.includes(id))
      const shuffledRemaining = shuffleArray(remaining)
      selectedCategories = [...selectedCategories, ...shuffledRemaining].slice(0, 6)
    }
  } else {
    // Random 6 categories
    const shuffled = shuffleArray(availableCategoryIds)
    selectedCategories = shuffled.slice(0, 6)
  }

  const board = []
  const categories = []

  for (const categoryId of selectedCategories) {
    const catInfo = ALL_CATEGORIES.find(c => c.id === categoryId)
    categories.push(catInfo?.short || 'Unknown')

    // Get questions for this category
    const catQuestions = filtered.filter(q => q.category_id === categoryId)

    // Separate by difficulty
    const easy = shuffleArray(catQuestions.filter(q => 
      q.difficulty === 'easy' && difficulties.includes('easy')
    ))
    const medium = shuffleArray(catQuestions.filter(q => 
      q.difficulty === 'medium' && difficulties.includes('medium')
    ))
    const hard = shuffleArray(catQuestions.filter(q => 
      q.difficulty === 'hard' && difficulties.includes('hard')
    ))

    // Pick questions for each point value
    const selected = [
      easy[0] || medium[0] || hard[0] || null,  // 100
      easy[1] || medium[1] || hard[1] || null,  // 200
      medium[0] || easy[2] || hard[2] || null,  // 300
      hard[0] || medium[2] || easy[3] || null,  // 400
      hard[1] || medium[3] || easy[4] || null   // 500
    ]

    const values = [100, 200, 300, 400, 500]
    for (let i = 0; i < 5; i++) {
      const q = selected[i]
      if (q) {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : []
        board.push({
          index: board.length,
          id: q.id,
          category: catInfo?.short || q.category,
          category_id: categoryId,
          value: values[i],
          question: q.question,
          answer: q.correct_answer,
          alternates: [],
          used: false,
          type: q.type,
          options: q.type === 'boolean'
            ? ['True', 'False']
            : shuffleArray([q.correct_answer, ...incorrectAnswers]),
          difficulty: q.difficulty
        })
      } else {
        // Placeholder if no question available
        board.push({
          index: board.length,
          id: null,
          category: catInfo?.short || 'Unknown',
          category_id: categoryId,
          value: values[i],
          question: 'Question not available',
          answer: 'N/A',
          alternates: [],
          used: false,
          type: 'multiple',
          options: ['N/A', 'N/A', 'N/A', 'N/A'],
          difficulty: 'medium'
        })
      }
    }
  }

  return { board, categories }
}

/**
 * Build 10 questions for Quick Mode
 * Each from a different category if possible
 */
export function buildQuickModeQuestions(options = {}) {
  if (!questionsCache || questionsCache.length === 0) {
    console.error('Questions cache not loaded!')
    return { questions: [] }
  }

  const {
    categoryIds = null,
    types = ['multiple', 'boolean'],
    minQuality = -5
  } = options

  // Filter questions by type and quality
  let filtered = questionsCache.filter(q =>
    types.includes(q.type) &&
    (q.likes - q.dislikes) >= minQuality
  )

  // Get available category IDs
  const availableCategoryIds = [...new Set(filtered.map(q => q.category_id))]

  // Select up to 10 different categories
  let selectedCategories
  if (categoryIds && categoryIds.length > 0) {
    const validCategories = categoryIds.filter(id => availableCategoryIds.includes(id))
    selectedCategories = shuffleArray(validCategories).slice(0, 10)
  } else {
    selectedCategories = shuffleArray(availableCategoryIds).slice(0, 10)
  }

  // If fewer than 10 categories, allow repeats
  while (selectedCategories.length < 10) {
    const randomCat = availableCategoryIds[Math.floor(Math.random() * availableCategoryIds.length)]
    selectedCategories.push(randomCat)
  }

  const questions = []

  for (let i = 0; i < 10; i++) {
    const categoryId = selectedCategories[i]
    const catInfo = ALL_CATEGORIES.find(c => c.id === categoryId)

    // Get questions for this category not already used
    const usedIds = questions.map(q => q.id)
    const available = shuffleArray(
      filtered.filter(q => q.category_id === categoryId && !usedIds.includes(q.id))
    )

    const q = available[0]
    if (q) {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : []
      questions.push({
        index: i,
        id: q.id,
        category: catInfo?.short || q.category,
        category_id: categoryId,
        question: q.question,
        answer: q.correct_answer,
        type: q.type,
        options: q.type === 'boolean'
          ? ['True', 'False']
          : shuffleArray([q.correct_answer, ...incorrectAnswers]),
        difficulty: q.difficulty
      })
    }
  }

  return { questions }
}

/**
 * Legacy function - now uses cache
 */
export async function fetchBoardFromDB(options = {}) {
  // Ensure cache is loaded
  if (!questionsCache) {
    await loadQuestionsCache()
  }
  
  // Build from cache (instant)
  return buildBoardFromCache(options)
}
