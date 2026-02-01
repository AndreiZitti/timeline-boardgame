-- Quiz Questions V2 - Clean slate with open-ended questions only
-- Drops old tables and creates simplified schema

-- Drop old triggers and functions first
DROP TRIGGER IF EXISTS trigger_update_vote_count ON games.quiz_question_votes;
DROP FUNCTION IF EXISTS games.update_question_vote_count();
DROP FUNCTION IF EXISTS games.increment_question_shown(UUID[]);

-- Drop old tables
DROP TABLE IF EXISTS games.quiz_question_votes;
DROP TABLE IF EXISTS games.quiz_questions;

-- Create new simplified questions table
CREATE TABLE games.quiz_questions (
  id SERIAL PRIMARY KEY,

  -- Core content
  question TEXT NOT NULL,
  answers TEXT[] NOT NULL,  -- First = display answer, rest = acceptable alternates

  -- Classification (5 fixed categories)
  category TEXT NOT NULL CHECK (category IN ('Science', 'History', 'Entertainment', 'Language', 'Random')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Provenance
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'opentdb', 'chatgpt', etc.
  source_id TEXT,  -- Original ID if imported from external source

  -- Quality tracking (updated during gameplay)
  plays INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_quiz_questions_category ON games.quiz_questions(category);
CREATE INDEX idx_quiz_questions_difficulty ON games.quiz_questions(difficulty);
CREATE INDEX idx_quiz_questions_quality ON games.quiz_questions(reports, plays);

-- RLS policies
ALTER TABLE games.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions
CREATE POLICY "Anyone can read quiz questions"
  ON games.quiz_questions FOR SELECT
  USING (true);

-- Anyone can update play stats (plays, correct, reports)
CREATE POLICY "Anyone can update quiz question stats"
  ON games.quiz_questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only authenticated/service can insert new questions
CREATE POLICY "Service role can insert quiz questions"
  ON games.quiz_questions FOR INSERT
  WITH CHECK (true);

-- Function to record a question result
CREATE OR REPLACE FUNCTION games.record_question_result(
  p_question_id INTEGER,
  p_was_correct BOOLEAN
)
RETURNS void AS $$
BEGIN
  UPDATE games.quiz_questions
  SET
    plays = plays + 1,
    correct = correct + CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql;

-- Function to report a question
CREATE OR REPLACE FUNCTION games.report_question(p_question_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE games.quiz_questions
  SET reports = reports + 1, updated_at = NOW()
  WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql;
