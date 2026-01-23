#!/usr/bin/env node
/**
 * Fetch questions from Open Trivia Database and store in Supabase
 * 
 * Usage: node scripts/fetch-opentdb-questions.js
 * 
 * Environment variables needed:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import crypto from 'crypto'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing environment variables!')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

// All Open TDB categories
const CATEGORIES = [
  { id: 9, name: 'General Knowledge' },
  { id: 10, name: 'Entertainment: Books' },
  { id: 11, name: 'Entertainment: Film' },
  { id: 12, name: 'Entertainment: Music' },
  { id: 13, name: 'Entertainment: Musicals & Theatres' },
  { id: 14, name: 'Entertainment: Television' },
  { id: 15, name: 'Entertainment: Video Games' },
  { id: 16, name: 'Entertainment: Board Games' },
  { id: 17, name: 'Science & Nature' },
  { id: 18, name: 'Science: Computers' },
  { id: 19, name: 'Science: Mathematics' },
  { id: 20, name: 'Mythology' },
  { id: 21, name: 'Sports' },
  { id: 22, name: 'Geography' },
  { id: 23, name: 'History' },
  { id: 24, name: 'Politics' },
  { id: 25, name: 'Art' },
  { id: 26, name: 'Celebrities' },
  { id: 27, name: 'Animals' },
  { id: 28, name: 'Vehicles' },
  { id: 29, name: 'Entertainment: Comics' },
  { id: 30, name: 'Science: Gadgets' },
  { id: 31, name: 'Entertainment: Japanese Anime & Manga' },
  { id: 32, name: 'Entertainment: Cartoon & Animations' }
]

const DIFFICULTIES = ['easy', 'medium', 'hard']
const TYPES = ['multiple', 'boolean']

// Rate limit: 1 request per 5 seconds
const RATE_LIMIT_MS = 5500

// Create hash from question text (for deduplication)
function createQuestionHash(question, correctAnswer) {
  const str = `${question}|${correctAnswer}`.toLowerCase().trim()
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 64)
}

// Decode URL-encoded strings
function decodeStr(str) {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

// Fetch questions from Open TDB
async function fetchQuestions(categoryId, difficulty, type, amount = 30) {
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=${type}&encode=url3986`
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (data.response_code !== 0) {
    // Code 1 = not enough questions, others = errors
    return []
  }
  
  return data.results.map(q => ({
    question_hash: createQuestionHash(q.question, q.correct_answer),
    category: decodeStr(q.category),
    category_id: categoryId,
    difficulty: q.difficulty,
    type: q.type,
    question: decodeStr(q.question),
    correct_answer: decodeStr(q.correct_answer),
    incorrect_answers: q.incorrect_answers.map(decodeStr),
    source: 'opentdb'
  }))
}

// Insert questions into Supabase
async function insertQuestions(questions) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/quiz_questions`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'games',
      'Prefer': 'resolution=ignore-duplicates'
    },
    body: JSON.stringify(questions)
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Insert error:', error)
    return 0
  }
  
  return questions.length
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Progress bar helper
function renderProgressBar(current, total, width = 30) {
  const percent = current / total
  const filled = Math.round(width * percent)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${Math.round(percent * 100)}%`
}

// Format time
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

// Clear lines and move cursor
function clearLines(n) {
  for (let i = 0; i < n; i++) {
    process.stdout.write('\x1b[1A\x1b[2K')
  }
}

// Main fetch loop
async function main() {
  const totalCombinations = CATEGORIES.length * DIFFICULTIES.length * TYPES.length
  
  console.log('')
  console.log('🎯 Open Trivia DB Question Fetcher')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Categories: ${CATEGORIES.length} | Difficulties: 3 | Types: 2`)
  console.log(`  Total API calls: ${totalCombinations}`)
  console.log(`  Estimated time: ~${Math.ceil(totalCombinations * RATE_LIMIT_MS / 60000)} minutes`)
  console.log('═══════════════════════════════════════════════════')
  console.log('')
  
  let totalFetched = 0
  let totalInserted = 0
  let totalEmpty = 0
  let totalErrors = 0
  let combinationIndex = 0
  const startTime = Date.now()
  
  // Initial display (will be updated)
  console.log('') // Progress bar line
  console.log('') // Category line
  console.log('') // Stats line
  console.log('') // ETA line
  console.log('') // Last result line
  
  let lastResult = 'Starting...'
  
  for (const category of CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      for (const type of TYPES) {
        combinationIndex++
        
        // Calculate ETA
        const elapsed = Date.now() - startTime
        const avgTimePerCall = combinationIndex > 1 ? elapsed / (combinationIndex - 1) : RATE_LIMIT_MS
        const remaining = (totalCombinations - combinationIndex) * avgTimePerCall
        
        // Update display
        clearLines(5)
        console.log(`  Progress: ${renderProgressBar(combinationIndex, totalCombinations)}  (${combinationIndex}/${totalCombinations})`)
        console.log(`  Category: ${category.name}`)
        console.log(`  Current:  ${difficulty} | ${type === 'multiple' ? 'Multiple Choice' : 'True/False'}`)
        console.log(`  Stats:    ${totalFetched.toLocaleString()} fetched | ${totalEmpty} empty | ${totalErrors} errors`)
        console.log(`  ETA:      ${formatTime(remaining)} remaining`)
        
        try {
          const questions = await fetchQuestions(category.id, difficulty, type, 30)
          totalFetched += questions.length
          
          if (questions.length > 0) {
            const inserted = await insertQuestions(questions)
            totalInserted += inserted
            lastResult = `✓ ${questions.length} questions from ${category.name}`
          } else {
            totalEmpty++
            lastResult = `⚠ No questions for ${category.name} (${difficulty}/${type})`
          }
        } catch (error) {
          totalErrors++
          lastResult = `✗ Error: ${error.message}`
        }
        
        // Rate limit
        await sleep(RATE_LIMIT_MS)
      }
    }
  }
  
  // Final display
  clearLines(5)
  const totalTime = Date.now() - startTime
  
  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('  ✅ COMPLETE!')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  📊 Questions fetched:  ${totalFetched.toLocaleString()}`)
  console.log(`  💾 Questions inserted: ${totalInserted.toLocaleString()}`)
  console.log(`  ⚠️  Empty responses:    ${totalEmpty}`)
  console.log(`  ❌ Errors:             ${totalErrors}`)
  console.log(`  ⏱️  Total time:         ${formatTime(totalTime)}`)
  console.log('═══════════════════════════════════════════════════')
  console.log('')
}

main().catch(console.error)
