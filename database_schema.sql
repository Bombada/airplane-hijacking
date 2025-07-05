-- Airplane Hijacking Game Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Rooms Table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_round INTEGER NOT NULL DEFAULT 1,
  current_phase VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'airplane_selection', 'discussion', 'card_selection', 'results')),
  phase_start_time TIMESTAMP WITH TIME ZONE,
  max_players INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players Table
CREATE TABLE IF NOT EXISTS players (
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
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  phase VARCHAR(20) NOT NULL DEFAULT 'airplane_selection' CHECK (phase IN ('airplane_selection', 'discussion', 'card_selection', 'results')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_room_id, round_number)
);

-- Airplanes Table
CREATE TABLE IF NOT EXISTS airplanes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  airplane_number INTEGER NOT NULL CHECK (airplane_number BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_round_id, airplane_number)
);

-- Player Cards Table
CREATE TABLE IF NOT EXISTS player_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('passenger', 'follower', 'hijacker')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Actions Table
CREATE TABLE IF NOT EXISTS player_actions (
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
CREATE TABLE IF NOT EXISTS round_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  airplane_number INTEGER NOT NULL,
  card_type VARCHAR(20) NOT NULL,
  round_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, game_round_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_game_room_id ON players(game_room_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_room_id ON game_rounds(game_room_id);
CREATE INDEX IF NOT EXISTS idx_airplanes_game_round_id ON airplanes(game_round_id);
CREATE INDEX IF NOT EXISTS idx_player_cards_player_id ON player_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_player_id ON player_actions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_game_round_id ON player_actions(game_round_id);
CREATE INDEX IF NOT EXISTS idx_round_results_player_id ON round_results(player_id);
CREATE INDEX IF NOT EXISTS idx_round_results_game_round_id ON round_results(game_round_id);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE airplanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_rounds" ON game_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on airplanes" ON airplanes FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_cards" ON player_cards FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_actions" ON player_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations on round_results" ON round_results FOR ALL USING (true); 