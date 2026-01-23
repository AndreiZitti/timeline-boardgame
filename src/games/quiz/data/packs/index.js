import testPack from './test-pack'

// Export all available question packs
export const packs = {
  'test-pack': testPack
}

// Get a pack by ID
export function getPack(packId) {
  return packs[packId] || null
}

// Get list of available packs
export function getPackList() {
  return Object.values(packs).map(pack => ({
    id: pack.id,
    name: pack.name,
    categoryCount: pack.categories.length,
    questionCount: pack.categories.reduce((sum, cat) => sum + cat.questions.length, 0)
  }))
}

// Build a board from a pack
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
        used: false
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
