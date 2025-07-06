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
  autoStartTime?: string;
}

interface UseGameStateWSResult {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  sendAction: (actionType: string, airplaneId?: string, cardId?: string) => void;
  sendCountdownMessage: (type: string, countdown?: number) => void;
  refetch: () => Promise<void>;
  countdownState: {
    active: boolean;
    countdown: number | null;
  };
}

export function useGameStateWS(roomCode: string, userId: string): UseGameStateWSResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdownState, setCountdownState] = useState({
    active: false,
    countdown: null as number | null
  });
  
  const { isConnected, sendMessage, lastMessage } = useWebSocket(roomCode, userId);
  const mountedRef = useRef(true);

  // Fetch initial game state
  const fetchGameState = async (shouldBroadcast: boolean = false) => {
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
        
        // Only broadcast if explicitly requested (e.g., after player actions)
        if (shouldBroadcast && isConnected) {
          const wsMessage = {
            type: 'game_state_update',
            gameState: result.data
          };
          console.log(`[GameStateWS] Broadcasting game state update`);
          sendMessage(wsMessage);
        }
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
        setTimeout(() => fetchGameState(true), 100);
      } else {
        console.error('[GameStateWS] Action failed:', response.status);
      }
    } catch (error) {
      console.error('[GameStateWS] Action error:', error);
    }
  };

  // Send countdown message via WebSocket
  const sendCountdownMessage = (type: string, countdown?: number) => {
    if (!isConnected) return;
    
    const wsMessage = {
      type,
      countdown
    };
    console.log(`[GameStateWS] Sending countdown message:`, wsMessage);
    sendMessage(wsMessage);
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
        // Skip state refresh during card selection and results phase to prevent UI flickering
        const currentPhase = gameState?.gameRoom?.current_phase;
        if (currentPhase !== 'card_selection' && currentPhase !== 'results') {
          console.log('[GameStateWS] Refreshing game state for player action');
          setTimeout(() => fetchGameState(), 100);
        } else {
          console.log('[GameStateWS] Skipping state refresh during card selection/results phase');
        }
        break;

      case 'game_state_update':
        console.log('[GameStateWS] Received game state update');
        // Skip game state updates during card selection and results phase to prevent UI flickering
        if (lastMessage.gameState) {
          const currentPhase = gameState?.gameRoom?.current_phase;
          const newPhase = lastMessage.gameState?.gameRoom?.current_phase;
          
          // Only update if phase changed or not in sensitive phases
          if (currentPhase !== newPhase || (newPhase !== 'card_selection' && newPhase !== 'results')) {
            console.log('[GameStateWS] Updating game state from WebSocket');
            setGameState(lastMessage.gameState);
          } else {
            console.log('[GameStateWS] Skipping game state update during card selection/results phase');
          }
        }
        break;

      case 'user_joined':
      case 'user_left':
        console.log('[GameStateWS] User joined/left, refreshing state');
        setTimeout(() => fetchGameState(), 100);
        break;

      case 'phase_change':
        console.log('[GameStateWS] Phase changed to:', lastMessage.phase);
        // Immediately refresh game state when phase changes
        setTimeout(() => fetchGameState(), 100);
        // Also reload the page to ensure clean state
        console.log('[GameStateWS] Reloading page due to admin phase change');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        break;

      case 'game_finished':
        console.log('[GameStateWS] Game finished:', lastMessage.message);
        // Immediately refresh game state when game is finished
        setTimeout(() => fetchGameState(), 100);
        // Also reload the page to ensure clean state
        console.log('[GameStateWS] Reloading page due to game finish');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        break;

      case 'admin_state_change':
        console.log('[GameStateWS] Admin state change detected:', lastMessage);
        // Reload page when admin makes any state changes
        console.log('[GameStateWS] Reloading page due to admin state change');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        break;

      case 'countdown_start':
        console.log('[GameStateWS] Countdown started');
        setCountdownState({
          active: true,
          countdown: lastMessage.countdown || 5
        });
        break;

      case 'countdown_update':
        console.log('[GameStateWS] Countdown update:', lastMessage.countdown);
        if (lastMessage.countdown !== undefined) {
          setCountdownState(prev => ({
            ...prev,
            countdown: lastMessage.countdown
          }));
        }
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
    sendCountdownMessage,
    refetch: fetchGameState,
    countdownState
  };
} 