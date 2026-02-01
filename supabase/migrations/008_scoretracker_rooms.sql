-- Score Tracker Live View Rooms
-- Table for syncing score tracker state to enable live spectator links

-- Ensure games schema exists
CREATE SCHEMA IF NOT EXISTS games;

CREATE TABLE IF NOT EXISTS games.scoretracker_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,           -- e.g., "X7K2" (short shareable code)
  game_type VARCHAR(20) NOT NULL             -- "whist" (later: rentz, septica, general)
    CHECK (game_type IN ('whist', 'rentz', 'septica', 'general')),
  host_id UUID NOT NULL,                     -- User ID from UserContext (authenticated user)
  players TEXT[] NOT NULL,                   -- Player names array
  game_config JSONB DEFAULT '{}'::jsonb,     -- Game-specific config (e.g., whistMode)
  game_state JSONB NOT NULL,                 -- Full game state (whistData array)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games.scoretracker_rooms ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read (viewers), only host can write
CREATE POLICY "Anyone can read scoretracker rooms"
  ON games.scoretracker_rooms FOR SELECT USING (true);

CREATE POLICY "Anyone can create scoretracker rooms"
  ON games.scoretracker_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update scoretracker rooms"
  ON games.scoretracker_rooms FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete scoretracker rooms"
  ON games.scoretracker_rooms FOR DELETE USING (true);

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE games.scoretracker_rooms;

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS scoretracker_rooms_code_idx ON games.scoretracker_rooms (code);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS scoretracker_rooms_updated_at_idx ON games.scoretracker_rooms (updated_at);

-- Cleanup function for old rooms (24 hours of inactivity)
CREATE OR REPLACE FUNCTION games.cleanup_old_scoretracker_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM games.scoretracker_rooms
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE games.scoretracker_rooms IS 'Live view rooms for score tracker games';

/*
game_config JSONB Structure (Whist):
{
  "whistMode": "1-8-1" | "8-1-8"
}

game_state JSONB Structure (Whist - whistData array):
[
  {
    "index": 0,
    "cards": 1,
    "phase": "complete" | "bidding" | "tricks" | "pending",
    "bids": [null, null, null],
    "tricks": [null, null, null],
    "scores": [null, null, null]
  },
  ...
]
*/
