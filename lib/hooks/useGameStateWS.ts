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
  const [lastRound, setLastRound] = useState<number | null>(null);
  const [lastGameStatus, setLastGameStatus] = useState<string | null>(null);
  
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
        // Force multiple refreshes to ensure state sync
        setTimeout(() => fetchGameState(), 500);
        setTimeout(() => fetchGameState(), 1000);
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
        
        // Immediately refresh game state
        setTimeout(() => fetchGameState(), 100);
        
        // Handle specific admin actions
        if (lastMessage.action === 'game_start') {
          console.log('[GameStateWS] Game start detected, forcing page reload');
          setTimeout(() => {
            // 캐시 무효화를 위해 timestamp 추가
            const timestamp = new Date().getTime();
            window.location.href = `${window.location.pathname}?t=${timestamp}`;
          }, 200);
        } else if (lastMessage.action === 'next_round') {
          console.log('[GameStateWS] Next round detected, forcing page reload');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          // For other admin changes, reload page after a delay
          console.log('[GameStateWS] Reloading page due to admin state change');
          setTimeout(() => {
            window.location.reload();
          }, 500);
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

  // 연결이 끊어졌다가 다시 연결될 때 게임 상태 확인
  useEffect(() => {
    if (isConnected && gameState && userId) {
      // 게임이 시작되었는데 아직 waiting 상태라면 새로고침
      const shouldReload = 
        gameState.gameRoom?.current_phase === 'waiting' && 
        gameState.gameRoom?.status === 'playing';
        
      if (shouldReload) {
        console.log('[GameStateWS] Game status is playing but phase is waiting, forcing reload');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  }, [isConnected, gameState]);

  // Monitor round changes and force refresh
  useEffect(() => {
    if (gameState?.gameRoom?.current_round && lastRound !== null) {
      const currentRound = gameState.gameRoom.current_round;
      if (currentRound !== lastRound) {
        console.log(`[GameStateWS] Round changed from ${lastRound} to ${currentRound}, forcing page refresh`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
    
    // Update lastRound
    if (gameState?.gameRoom?.current_round) {
      setLastRound(gameState.gameRoom.current_round);
    }
  }, [gameState?.gameRoom?.current_round, lastRound]);

  // Monitor game status changes (waiting -> playing)
  useEffect(() => {
    if (gameState?.gameRoom?.status && lastGameStatus !== null) {
      const currentStatus = gameState.gameRoom.status;
      if (currentStatus !== lastGameStatus) {
        console.log(`[GameStateWS] Game status changed from ${lastGameStatus} to ${currentStatus}, forcing page refresh`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
    
    // Update lastGameStatus
    if (gameState?.gameRoom?.status) {
      setLastGameStatus(gameState.gameRoom.status);
    }
  }, [gameState?.gameRoom?.status, lastGameStatus]);

  return {
    gameState,
    loading,
    error,
    isConnected,
    sendAction,
    refetch: fetchGameState
  };
} 