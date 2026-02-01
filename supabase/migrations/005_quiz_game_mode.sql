-- Add game_mode column, questions column, theme, and wagering phase to quiz_rooms

-- Add game_mode column
ALTER TABLE games.quiz_rooms
ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) DEFAULT 'classic'
CHECK (game_mode IN ('quick', 'classic'));

-- Add questions column for quick mode
-- Array of: { id, question, correct_answer, incorrect_answers, category, difficulty }
ALTER TABLE games.quiz_rooms
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';

-- Add round_number column for quick mode (tracks current round 1-10)
ALTER TABLE games.quiz_rooms
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 0;

-- Add theme column (replaces question_pack)
-- Object: { id, name }
ALTER TABLE games.quiz_rooms
ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"id": "mixed", "name": "Mixed"}';

-- Update phase constraint to include 'wagering'
ALTER TABLE games.quiz_rooms
DROP CONSTRAINT IF EXISTS quiz_rooms_phase_check;

ALTER TABLE games.quiz_rooms
ADD CONSTRAINT quiz_rooms_phase_check
CHECK (phase IN ('lobby', 'picking', 'answering', 'reveal', 'wagering', 'ended'));
