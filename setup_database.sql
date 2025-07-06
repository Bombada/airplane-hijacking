-- Airplane Hijacking Game Database Setup for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS round_results CASCADE;
DROP TABLE IF EXISTS player_actions CASCADE;
DROP TABLE IF EXISTS player_cards CASCADE;
DROP TABLE IF EXISTS airplanes CASCADE;
DROP TABLE IF EXISTS game_rounds CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;

-- Game Rooms Table
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_round INTEGER NOT NULL DEFAULT 0,
  current_phase VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'airplane_selection', 'discussion', 'card_selection', 'results')),
  phase_start_time TIMESTAMP WITH TIME ZONE,
  max_players INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players Table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_room_id, user_id)
);

-- Game Rounds Table
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  phase VARCHAR(20) NOT NULL DEFAULT 'airplane_selection' CHECK (phase IN ('airplane_selection', 'discussion', 'card_selection', 'results')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_room_id, round_number)
);

-- Airplanes Table
CREATE TABLE airplanes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  airplane_number INTEGER NOT NULL CHECK (airplane_number BETWEEN 1 AND 4),
  max_passengers INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_round_id, airplane_number)
);

-- Player Cards Table
CREATE TABLE player_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('passenger', 'follower', 'hijacker')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Actions Table
CREATE TABLE player_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  airplane_id UUID REFERENCES airplanes(id) ON DELETE SET NULL,
  selected_card_id UUID REFERENCES player_cards(id) ON DELETE SET NULL,
  action_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, game_round_id)
);

-- Round Results Table
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  airplane_number INTEGER NOT NULL,
  card_type VARCHAR(20) NOT NULL,
  round_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, game_round_id)
);

-- Function to create airplanes with default max passengers
CREATE OR REPLACE FUNCTION create_round_airplanes()
RETURNS TRIGGER AS $$
BEGIN
  -- Create airplanes with default max passengers for the new round
  INSERT INTO airplanes (game_round_id, airplane_number, max_passengers)
  VALUES
    (NEW.id, 1, 1),
    (NEW.id, 2, 1),
    (NEW.id, 3, 3),
    (NEW.id, 4, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create airplanes when a new round is created
CREATE TRIGGER create_round_airplanes_trigger
AFTER INSERT ON game_rounds
FOR EACH ROW
EXECUTE FUNCTION create_round_airplanes();

-- Indexes for better performance
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX idx_players_game_room_id ON players(game_room_id);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_game_rounds_game_room_id ON game_rounds(game_room_id);
CREATE INDEX idx_airplanes_game_round_id ON airplanes(game_round_id);
CREATE INDEX idx_player_cards_player_id ON player_cards(player_id);
CREATE INDEX idx_player_actions_player_id ON player_actions(player_id);
CREATE INDEX idx_player_actions_game_round_id ON player_actions(game_round_id);
CREATE INDEX idx_round_results_player_id ON round_results(player_id);
CREATE INDEX idx_round_results_game_round_id ON round_results(game_round_id);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE airplanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now - you can restrict these later)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_rounds" ON game_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on airplanes" ON airplanes FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_cards" ON player_cards FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_actions" ON player_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations on round_results" ON round_results FOR ALL USING (true);

-- Enable Realtime (optional - for real-time updates)
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE airplanes;
ALTER PUBLICATION supabase_realtime ADD TABLE player_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE player_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE round_results; 