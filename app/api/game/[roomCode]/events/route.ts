import { NextRequest } from 'next/server';
import mockGameState from '@/lib/game/mockGameState';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  // Set up SSE headers
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection message
  const sendEvent = (data: any, event?: string) => {
    const message = `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(message));
  };

  // Send initial game state
  try {
    const gameRoom = mockGameState.getGameRoom(roomCode);
    if (gameRoom) {
      const players = mockGameState.getPlayers(gameRoom.id);
      const currentPlayer = mockGameState.getPlayer(userId, gameRoom.id);
      
      let currentRound = null;
      let airplanes = null;
      let myCards = null;
      let myActions = null;
      let allPlayerActions = null;

      if (gameRoom.status === 'playing' && gameRoom.current_round > 0) {
        currentRound = mockGameState.getCurrentRound(gameRoom.id, gameRoom.current_round);
        
        if (currentRound) {
          airplanes = mockGameState.getAirplanes(currentRound.id);
          myActions = mockGameState.getPlayerActions(currentPlayer?.id || '', currentRound.id);
          allPlayerActions = mockGameState.getAllRoundActions(currentRound.id);
        }

        if (currentPlayer) {
          myCards = mockGameState.getPlayerCards(currentPlayer.id);
        }
      }

      const gameState = {
        gameRoom,
        players,
        currentPlayer,
        currentRound,
        airplanes,
        myCards,
        myActions,
        allPlayerActions,
        hasActiveTimer: mockGameState.hasActiveTimer(roomCode)
      };

      sendEvent(gameState, 'gameState');
    }
  } catch (error) {
    console.error('Error sending initial state:', error);
  }

  // Set up polling to check for updates
  const interval = setInterval(() => {
    try {
      const gameRoom = mockGameState.getGameRoom(roomCode);
      if (gameRoom) {
        const players = mockGameState.getPlayers(gameRoom.id);
        const currentPlayer = mockGameState.getPlayer(userId, gameRoom.id);
        
        let currentRound = null;
        let airplanes = null;
        let myCards = null;
        let myActions = null;
        let allPlayerActions = null;

        if (gameRoom.status === 'playing' && gameRoom.current_round > 0) {
          currentRound = mockGameState.getCurrentRound(gameRoom.id, gameRoom.current_round);
          
          if (currentRound) {
            airplanes = mockGameState.getAirplanes(currentRound.id);
            myActions = mockGameState.getPlayerActions(currentPlayer?.id || '', currentRound.id);
            allPlayerActions = mockGameState.getAllRoundActions(currentRound.id);
          }

          if (currentPlayer) {
            myCards = mockGameState.getPlayerCards(currentPlayer.id);
          }
        }

        const gameState = {
          gameRoom,
          players,
          currentPlayer,
          currentRound,
          airplanes,
          myCards,
          myActions,
          allPlayerActions,
          hasActiveTimer: mockGameState.hasActiveTimer(roomCode)
        };

        sendEvent(gameState, 'gameState');
      }
    } catch (error) {
      console.error('Error in polling:', error);
    }
  }, 1000); // Poll every second

  // Clean up when client disconnects
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 