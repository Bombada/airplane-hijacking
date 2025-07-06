'use client';

import { useState, useEffect, useRef } from 'react';

interface Airplane {
  id: string;
  game_round_id: string;
  airplane_number: number;
  max_passengers: number;
}

interface GameState {
  gameRoom: any;
  players: any[];
  currentPlayer: any;
  currentRound?: any;
  airplanes?: Airplane[];
  myCards?: any[];
  myActions?: any[];
  allPlayerActions?: any[];
  hasActiveTimer?: boolean;
}

interface UseGameStateResult {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

export function useGameState(roomCode: string, userId: string): UseGameStateResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchGameState = async () => {
    if (!mountedRef.current || !userId) return;
    
    try {
      const response = await fetch(`/api/game/${roomCode}/state?userId=${userId}`);
      
      if (!mountedRef.current) return;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!mountedRef.current) return;
      
      // Extract data from the API response
      if (result.data) {
        setGameState(result.data);
        setError(null);
        setIsConnected(true);
        setLoading(false);
      } else if (result.error) {
        throw new Error(result.error);
      }
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Failed to fetch game state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
      setLoading(false);
    }
  };

  const refetch = async () => {
    if (!userId) return;
    await fetchGameState();
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Only start fetching if userId is available
    if (!userId) {
      setLoading(true);
      return;
    }
    
    // Initial fetch
    fetchGameState();
    
    // Set up polling every 1 second for better real-time sync during debugging
    intervalRef.current = setInterval(fetchGameState, 1000);
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomCode, userId]);

  return {
    gameState,
    loading,
    error,
    isConnected,
    refetch
  };
} 