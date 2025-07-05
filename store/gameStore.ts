'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameRoom, Player, PlayerCard, Airplane } from '@/types/database';

interface GameState {
  // Game data
  gameRoom: GameRoom | null;
  players: Player[];
  currentPlayer: Player | null;
  myCards: PlayerCard[];
  airplanes: Airplane[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setGameRoom: (room: GameRoom) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setMyCards: (cards: PlayerCard[]) => void;
  setAirplanes: (airplanes: Airplane[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearGame: () => void;
  
  // Game actions
  updateGameState: (gameState: any) => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      gameRoom: null,
      players: [],
      currentPlayer: null,
      myCards: [],
      airplanes: [],
      isLoading: false,
      error: null,
      
      // Actions
      setGameRoom: (room) => set({ gameRoom: room }),
      setPlayers: (players) => set({ players }),
      setCurrentPlayer: (player) => set({ currentPlayer: player }),
      setMyCards: (cards) => set({ myCards: cards }),
      setAirplanes: (airplanes) => set({ airplanes }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearGame: () => set({
        gameRoom: null,
        players: [],
        currentPlayer: null,
        myCards: [],
        airplanes: [],
        isLoading: false,
        error: null,
      }),
      
      // Update entire game state
      updateGameState: (gameState) => set({
        gameRoom: gameState.gameRoom,
        players: gameState.players,
        currentPlayer: gameState.currentPlayer,
        myCards: gameState.myCards || [],
        airplanes: gameState.airplanes || [],
      }),
    }),
    {
      name: 'game-store',
    }
  )
); 