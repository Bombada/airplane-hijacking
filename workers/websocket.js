// Import the GameRoom Durable Object
import { GameRoom } from './game-room.js';

// Export the GameRoom class so it can be used as a Durable Object
export { GameRoom };

// Cloudflare Workers WebSocket Server
export default {
  async fetch(request, env, ctx) {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocketUpgrade(request, env);
    }
    
    // Handle regular HTTP requests
    return new Response('WebSocket server is running', { status: 200 });
  }
};

async function handleWebSocketUpgrade(request, env) {
  const url = new URL(request.url);
  const roomCode = url.searchParams.get('room');
  
  if (!roomCode) {
    return new Response('Room code is required', { status: 400 });
  }

  // Get the Durable Object for this room
  const roomId = env.GAME_ROOMS.idFromName(roomCode);
  const roomObject = env.GAME_ROOMS.get(roomId);
  
  // Forward the WebSocket request to the Durable Object
  return roomObject.fetch(new Request(request.url.replace(url.pathname, '/websocket'), {
    method: 'GET',
    headers: request.headers
  }));
} 