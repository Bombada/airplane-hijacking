const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store client connections by room
const rooms = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  let currentRoom = null;
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'join_room':
          currentRoom = data.roomCode;
          userId = data.userId;
          
          // Add client to room
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Map());
          }
          rooms.get(currentRoom).set(userId, ws);
          
          console.log(`User ${userId} joined room ${currentRoom}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'joined',
            roomCode: currentRoom,
            userId: userId
          }));
          
          // Notify other clients in the room
          broadcastToRoom(currentRoom, {
            type: 'user_joined',
            userId: userId
          }, userId);
          break;

        case 'player_action':
          if (currentRoom && userId) {
            console.log(`Player action from ${userId} in room ${currentRoom}:`, data.action);
            
            // Broadcast action notification to all OTHER clients in the room (not sender)
            broadcastToRoom(currentRoom, {
              type: 'player_action',
              userId: userId,
              action: data.action
            }, userId); // Exclude the sender
          }
          break;

        case 'game_state_update':
          if (currentRoom) {
            console.log(`Game state update for room ${currentRoom}`);
            
            // Broadcast state update to all OTHER clients in the room (not sender)
            broadcastToRoom(currentRoom, {
              type: 'game_state_update',
              gameState: data.gameState
            }, userId); // Exclude the sender
          }
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    
    // Remove client from room
    if (currentRoom && userId && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(userId);
      
      // If room is empty, remove it
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      } else {
        // Notify other clients that user left
        broadcastToRoom(currentRoom, {
          type: 'user_left',
          userId: userId
        }, userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper function to broadcast message to all clients in a room
function broadcastToRoom(roomCode, message, excludeUserId = null) {
  if (!rooms.has(roomCode)) return;
  
  const roomClients = rooms.get(roomCode);
  const messageStr = JSON.stringify(message);
  
  roomClients.forEach((clientWs, clientUserId) => {
    if (clientUserId !== excludeUserId && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(messageStr);
    }
  });
}

// Start server
const PORT = process.env.WS_PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    server.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
}); 