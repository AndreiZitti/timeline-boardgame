-- Add likes/dislikes columns to quiz questions
-- Simple voting without tracking who voted

ALTER TABLE games.quiz_questions
  ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0;

-- Function to like a question
CREATE OR REPLACE FUNCTION games.like_question(p_question_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE games.quiz_questions
  SET likes = likes + 1, updated_at = NOW()
  WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql;

-- Function to dislike a question
CREATE OR REPLACE FUNCTION games.dislike_question(p_question_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE games.quiz_questions
  SET dislikes = dislikes + 1, updated_at = NOW()
  WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql;
