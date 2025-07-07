export interface GameRoom {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  current_phase: 'waiting' | 'airplane_selection' | 'discussion' | 'card_selection' | 'results';
  phase_start_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_room_id: string;
  user_id: string;
  username: string;
  total_score: number;
  is_ready: boolean;
  joined_at: string;
}

export interface GameRound {
  id: string;
  game_room_id: string;
  round_number: number;
  status: 'active' | 'completed';
  created_at: string;
}

export interface Airplane {
  id: string;
  game_round_id: string;
  airplane_number: number;
  created_at: string;
}

export interface PlayerCard {
  id: string;
  player_id: string;
  card_type: 'passenger' | 'follower' | 'hijacker' | 'baby' | 'couple' | 'single';
  is_used: boolean;
  created_at: string;
}

export interface PlayerAction {
  id: string;
  player_id: string;
  game_round_id: string;
  airplane_id?: string;
  selected_card_id?: string;
  created_at: string;
}

export interface RoundResult {
  id: string;
  player_id: string;
  game_round_id: string;
  round_score: number;
  created_at: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// 게임 상태 타입
export type GamePhase = 'waiting' | 'airplane_selection' | 'discussion' | 'card_selection' | 'results';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type CardType = 'passenger' | 'follower' | 'hijacker' | 'baby' | 'couple' | 'single'; 