'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface GameState {
  gameRoom: any;
  players: any[];
  currentPlayer: any;
  currentRound?: any;
  airplanes?: any[];
  myCards?: any[];
  myActions?: any[];
  allPlayerActions?: any[];
  hasActiveTimer?: boolean;
}

interface UseGameStateWSResult {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  sendAction: (actionType: string, airplaneId?: string, cardId?: string) => void;
  refetch: () => Promise<void>;
}

export function useGameStateWS(roomCode: string, userId: string): UseGameStateWSResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected, sendMessage, lastMessage } = useWebSocket(roomCode, userId);
  const mountedRef = useRef(true);

  // Fetch initial game state
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
      
      if (result.data) {
        setGameState(result.data);
        setError(null);
        setLoading(false);
        
        // Broadcast updated game state to other clients (they will receive it and update their UI)
        const wsMessage = {
          type: 'game_state_update',
          gameState: result.data
        };
        console.log(`[GameStateWS] Broadcasting game state update, connected: ${isConnected}`);
        console.log(`[GameStateWS] WebSocket message:`, wsMessage);
        sendMessage(wsMessage);
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('[GameStateWS] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  // Send player action via WebSocket and API
  const sendAction = async (actionType: string, airplaneId?: string, cardId?: string) => {
    console.log(`[GameStateWS] Sending action: ${actionType}, connected: ${isConnected}`);
    
    try {
      // Send to API first
      const response = await fetch(`/api/game/${roomCode}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          actionType,
          airplaneId,
          cardId,
        }),
      });

      console.log(`[GameStateWS] API response status: ${response.status}`);

      if (response.ok) {
        // Notify other players via WebSocket (without game state data)
        const wsMessage = {
          type: 'player_action',
          action: {
            actionType,
            airplaneId,
            cardId,
            userId // Include userId to identify who made the action
          }
        };
        console.log(`[GameStateWS] Sending WebSocket message:`, wsMessage);
        sendMessage(wsMessage);
        
        // Fetch updated state for current user
        console.log(`[GameStateWS] Fetching updated state...`);
        setTimeout(() => fetchGameState(), 100);
      } else {
        console.error('[GameStateWS] Action failed:', response.status);
      }
    } catch (error) {
      console.error('[GameStateWS] Action error:', error);
    }
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('[GameStateWS] Processing WebSocket message:', lastMessage);

    switch (lastMessage.type) {
      case 'joined':
        console.log('[GameStateWS] Successfully joined room');
        fetchGameState();
        break;

      case 'player_action':
        console.log('[GameStateWS] Received player action from another user:', lastMessage.action);
        // Always refresh game state when receiving player actions
        setTimeout(() => fetchGameState(), 100);
        break;

      case 'game_state_update':
        console.log('[GameStateWS] Received game state update');
        // Accept game state updates to keep UI in sync
        if (lastMessage.gameState) {
          console.log('[GameStateWS] Updating game state from WebSocket');
          setGameState(lastMessage.gameState);
        }
        break;

      case 'user_joined':
      case 'user_left':
        console.log('[GameStateWS] User joined/left, refreshing state');
        setTimeout(() => fetchGameState(), 100);
        break;
    }
  }, [lastMessage]);

  // Initial setup
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, [roomCode, userId]);

  // Fetch when connected
  useEffect(() => {
    if (isConnected && userId) {
      fetchGameState();
    }
  }, [isConnected, userId]);

  return {
    gameState,
    loading,
    error,
    isConnected,
    sendAction,
    refetch: fetchGameState
  };
} 