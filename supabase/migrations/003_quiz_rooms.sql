-- Quiz Game Rooms
-- Jeopardy-style trivia where everyone answers and fastest correct gets most points

CREATE TABLE IF NOT EXISTS games.quiz_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(5) UNIQUE NOT NULL,
  phase VARCHAR(20) NOT NULL DEFAULT 'lobby' CHECK (phase IN ('lobby', 'picking', 'answering', 'reveal', 'ended')),
  
  players JSONB NOT NULL DEFAULT '[]',
  -- Array of: { id, name, score, hasAnswered }
  
  host_id VARCHAR(255) NOT NULL,
  picker_id VARCHAR(255),
  
  question_pack VARCHAR(100),
  board JSONB,
  -- Array of: { category, value, question, answer, alternates, used }
  
  current_question JSONB,
  -- { index, started_at, submissions: [{ player_id, answer, submitted_at, correct }] }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for room lookups by code
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_code ON games.quiz_rooms(code);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games.quiz_rooms;

-- RLS policies
ALTER TABLE games.quiz_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rooms (needed for joining)
CREATE POLICY "Anyone can read quiz rooms"
  ON games.quiz_rooms FOR SELECT
  USING (true);

-- Allow anyone to insert rooms (for creating)
CREATE POLICY "Anyone can create quiz rooms"
  ON games.quiz_rooms FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update rooms (game state changes)
CREATE POLICY "Anyone can update quiz rooms"
  ON games.quiz_rooms FOR UPDATE
  USING (true);

-- Allow anyone to delete rooms (cleanup)
CREATE POLICY "Anyone can delete quiz rooms"
  ON games.quiz_rooms FOR DELETE
  USING (true);
