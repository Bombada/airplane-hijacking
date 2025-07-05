'use client';

import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketResult {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(roomCode: string, userId: string): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = () => {
    if (!roomCode || !userId || !mountedRef.current) return;

    try {
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://your-domain.com:8080' 
        : 'ws://localhost:8080';
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        
        // Join room
        ws.send(JSON.stringify({
          type: 'join_room',
          roomCode,
          userId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Received:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect after 3 seconds if still mounted
        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('[WebSocket] Attempting to reconnect...');
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setIsConnected(false);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomCode, userId]);

  return {
    isConnected,
    sendMessage,
    lastMessage
  };
} 