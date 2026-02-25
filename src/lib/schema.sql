-- CoupleSync Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user1_id VARCHAR(255),
  user2_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  compatibility_score INTEGER,
  current_question INTEGER DEFAULT 0
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  question_index INTEGER NOT NULL,
  answer VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, question_index)
);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for this use case)
CREATE POLICY "Allow all operations on rooms" ON rooms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on responses" ON responses
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_responses_room_id ON responses(room_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);

-- Function to generate a random 6-character room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Optional: Auto-cleanup old rooms after 24 hours
-- (Run this as a scheduled job or cron)
-- DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '24 hours' AND status = 'completed';
