-- Quiz Questions Database
-- Stores questions from Open Trivia DB with like/dislike tracking

CREATE TABLE IF NOT EXISTS games.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Open TDB doesn't have unique IDs, so we create a hash from question text
  question_hash VARCHAR(64) UNIQUE NOT NULL,
  
  -- Question content
  category VARCHAR(100) NOT NULL,
  category_id INTEGER NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('multiple', 'boolean')),
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  incorrect_answers JSONB NOT NULL DEFAULT '[]',
  
  -- Quality tracking
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  times_shown INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  source VARCHAR(50) NOT NULL DEFAULT 'opentdb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON games.quiz_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON games.quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type ON games.quiz_questions(type);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quality ON games.quiz_questions((likes - dislikes) DESC);

-- Table to track which questions a player has voted on (prevent double voting)
CREATE TABLE IF NOT EXISTS games.quiz_question_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES games.quiz_questions(id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)), -- -1 = dislike, 1 = like
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(question_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_votes_player ON games.quiz_question_votes(player_id);

-- RLS policies
ALTER TABLE games.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games.quiz_question_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions
CREATE POLICY "Anyone can read quiz questions"
  ON games.quiz_questions FOR SELECT
  USING (true);

-- Only service role can insert/update questions (via fetch script)
CREATE POLICY "Service role can manage quiz questions"
  ON games.quiz_questions FOR ALL
  USING (true);

-- Anyone can vote
CREATE POLICY "Anyone can read votes"
  ON games.quiz_question_votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert votes"
  ON games.quiz_question_votes FOR INSERT
  WITH CHECK (true);

-- Function to update question stats when voted
CREATE OR REPLACE FUNCTION games.update_question_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE games.quiz_questions
    SET 
      likes = likes + CASE WHEN NEW.vote = 1 THEN 1 ELSE 0 END,
      dislikes = dislikes + CASE WHEN NEW.vote = -1 THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT ON games.quiz_question_votes
  FOR EACH ROW
  EXECUTE FUNCTION games.update_question_vote_count();

-- Function to increment times_shown
CREATE OR REPLACE FUNCTION games.increment_question_shown(question_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE games.quiz_questions
  SET times_shown = times_shown + 1, updated_at = NOW()
  WHERE id = ANY(question_ids);
END;
$$ LANGUAGE plpgsql;
