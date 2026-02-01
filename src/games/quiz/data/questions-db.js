// Quiz Questions Database
// Re-exports from hardcoded-questions for now
// Can be extended to fetch from Supabase later

import { supabaseGames } from '@/lib/supabase/client'
import { HARDCODED_QUESTIONS as hardcodedQuestions } from './hardcoded-questions'

// Re-export from hardcoded questions
export {
  CATEGORIES,
  getRandomQuestions,
  buildBoard,
  HARDCODED_QUESTIONS
} from './hardcoded-questions'

// Cache state (for now uses hardcoded questions directly)
let cacheLoaded = false

/**
 * Load questions into cache
 * Currently just marks hardcoded questions as ready
 * TODO: Implement OpenTDB fetching or Supabase loading
 */
export async function loadQuestionsCache() {
  try {
    // For now, just validate hardcoded questions exist
    if (!hardcodedQuestions || hardcodedQuestions.length === 0) {
      return { success: false, error: 'No questions available' }
    }
    cacheLoaded = true
    return { success: true, count: hardcodedQuestions.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  return {
    loaded: cacheLoaded,
    count: hardcodedQuestions?.length || 0
  }
}

/**
 * Check if user answer is correct (simple array matching)
 */
export function isAnswerCorrect(userAnswer, acceptableAnswers) {
  const normalized = userAnswer.toLowerCase().trim()
  return acceptableAnswers.some(a => a.toLowerCase().trim() === normalized)
}

/**
 * Record question result (call after revealing answers)
 * For future use when questions are in Supabase
 */
export async function recordQuestionResult(questionId, wasCorrect) {
  try {
    const { error } = await supabaseGames.rpc('record_question_result', {
      p_question_id: questionId,
      p_was_correct: wasCorrect
    })
    if (error) console.error('Failed to record question result:', error)
  } catch (err) {
    // Silently fail - stats tracking is not critical
  }
}

/**
 * Report a bad question
 * For future use when questions are in Supabase
 */
export async function reportQuestion(questionId) {
  try {
    const { error } = await supabaseGames.rpc('report_question', {
      p_question_id: questionId
    })
    if (error) console.error('Failed to report question:', error)
  } catch (err) {
    // Silently fail - reporting is not critical
  }
}
