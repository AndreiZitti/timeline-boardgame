import testPack from './test-pack'

// Export all available question packs
export const packs = {
  'test-pack': testPack
}

// Special pack IDs that are fetched dynamically
export const DYNAMIC_PACKS = {
  'opentdb': {
    id: 'opentdb',
    name: 'Open Trivia (Live)',
    description: 'Fetches fresh questions from the API',
    categoryCount: 6,
    questionCount: 30,
    isDynamic: true
  },
  'opentdb-db': {
    id: 'opentdb-db',
    name: 'Open Trivia (Database)',
    description: 'Curated questions with like/dislike voting',
    categoryCount: 6,
    questionCount: 30,
    isDynamic: true,
    hasVoting: true
  }
}

// Get a pack by ID
export function getPack(packId) {
  return packs[packId] || null
}

// Get list of available packs (including dynamic ones)
export function getPackList() {
  const staticPacks = Object.values(packs).map(pack => ({
    id: pack.id,
    name: pack.name,
    categoryCount: pack.categories.length,
    questionCount: pack.categories.reduce((sum, cat) => sum + cat.questions.length, 0),
    isDynamic: false
  }))
  
  const dynamicPacks = Object.values(DYNAMIC_PACKS)
  
  return [...dynamicPacks, ...staticPacks]
}

// Check if a pack is dynamic (needs to be fetched)
export function isDynamicPack(packId) {
  return packId in DYNAMIC_PACKS
}

// Build a board from a static pack
export function buildBoard(packId) {
  const pack = getPack(packId)
  if (!pack) return null

  const board = []
  
  pack.categories.forEach((category, catIndex) => {
    category.questions.forEach((question, qIndex) => {
      board.push({
        index: catIndex * 5 + qIndex,
        category: category.name,
        value: question.value,
        question: question.q,
        answer: question.a,
        alternates: question.alt || [],
        used: false,
        // For static packs, default to free-text input
        type: 'text',
        options: null
      })
    })
  })

  return board
}

// Get categories from a pack (for board headers)
export function getCategories(packId) {
  const pack = getPack(packId)
  if (!pack) return []
  return pack.categories.map(cat => cat.name)
}

// Get categories from a board directly (for dynamic packs)
export function getCategoriesFromBoard(board) {
  if (!board || board.length === 0) return []
  // Get unique categories in order
  const seen = new Set()
  const categories = []
  for (const q of board) {
    if (!seen.has(q.category)) {
      seen.add(q.category)
      categories.push(q.category)
    }
  }
  return categories
}
