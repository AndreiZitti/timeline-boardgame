-- Add game_mode column and wagering phase to quiz_rooms

-- Add game_mode column
ALTER TABLE games.quiz_rooms
ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) DEFAULT 'classic'
CHECK (game_mode IN ('quick', 'classic'));

-- Update phase constraint to include 'wagering'
ALTER TABLE games.quiz_rooms
DROP CONSTRAINT IF EXISTS quiz_rooms_phase_check;

ALTER TABLE games.quiz_rooms
ADD CONSTRAINT quiz_rooms_phase_check
CHECK (phase IN ('lobby', 'picking', 'answering', 'reveal', 'wagering', 'ended'));
