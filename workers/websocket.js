// Cloudflare Workers WebSocket 서버
// Durable Objects를 사용하여 상태 관리

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env, ctx);
  },
};

export class WebSocketDurableObject {
  constructor(controller, env) {
    this.controller = controller;
    this.env = env;
    this.sessions = new Map(); // userId -> WebSocket
    this.roomCode = null;
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      
      // Handle HTTP notification requests
      if (url.pathname === '/notify' && request.method === 'POST') {
        const data = await request.json();
        console.log(`Durable Object received notification for room ${this.roomCode || data.roomCode}:`, data);
        console.log(`Current active sessions: ${this.sessions.size}`);
        
        // Set room code if not already set
        if (!this.roomCode && data.roomCode) {
          this.roomCode = data.roomCode;
        }
        
        // Handle different types of notifications
        switch (data.type) {
          case 'admin_state_change':
            this.handleAdminStateChange(null, data);
            break;
          case 'phase_change':
            this.handlePhaseChange(null, data);
            break;
          case 'game_finished':
            this.handleGameFinished(null, data);
            break;
          default:
            console.log('Unknown notification type:', data.type);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          activeSessions: this.sessions.size,
          roomCode: this.roomCode 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Handle WebSocket upgrade
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      
      const roomCode = url.searchParams.get('roomCode');
      
      if (!roomCode) {
        console.error('WebSocket connection failed: No room code provided');
        server.close(1008, 'Room code is required');
        return new Response('Room code is required', { status: 400 });
      }

      this.roomCode = roomCode;
      console.log(`WebSocket connection established for room: ${roomCode}`);
      
      server.addEventListener('message', (event) => {
        try {
          this.handleMessage(server, event.data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      server.addEventListener('close', (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.handleClose(server);
      });

      // Add error handling
      server.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
      });

      // Send initial connection confirmation
      try {
        server.send(JSON.stringify({
          type: 'connection_established',
          roomCode: roomCode,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending initial message:', error);
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      return new Response('WebSocket initialization failed', { status: 500 });
    }
  }

  handleMessage(webSocket, message) {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'join_room':
          this.handleJoinRoom(webSocket, data);
          break;
        case 'player_action':
          this.handlePlayerAction(webSocket, data);
          break;
        case 'game_state_update':
          this.handleGameStateUpdate(webSocket, data);
          break;
        case 'phase_change':
          this.handlePhaseChange(webSocket, data);
          break;
        case 'game_finished':
          this.handleGameFinished(webSocket, data);
          break;
        case 'admin_state_change':
          this.handleAdminStateChange(webSocket, data);
          break;
        case 'countdown_start':
        case 'countdown_update':
          this.handleCountdown(webSocket, data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  handleJoinRoom(webSocket, data) {
    const { userId, roomCode } = data;
    
    // Store user session
    this.sessions.set(userId, webSocket);
    webSocket.userId = userId;
    
    console.log(`User ${userId} joined room ${roomCode}`);
    
    // Send confirmation
    webSocket.send(JSON.stringify({
      type: 'joined',
      roomCode: roomCode,
      userId: userId
    }));
    
    // Notify other clients
    this.broadcastToOthers(userId, {
      type: 'user_joined',
      userId: userId
    });
  }

  handlePlayerAction(webSocket, data) {
    const userId = webSocket.userId;
    if (!userId) return;
    
    console.log(`Player action from ${userId}:`, data.action);
    
    this.broadcastToOthers(userId, {
      type: 'player_action',
      userId: userId,
      action: data.action
    });
  }

  handleGameStateUpdate(webSocket, data) {
    const userId = webSocket.userId;
    if (!userId) return;
    
    console.log(`Game state update from ${userId}`);
    
    this.broadcastToOthers(userId, {
      type: 'game_state_update',
      gameState: data.gameState
    });
  }

  handlePhaseChange(webSocket, data) {
    console.log(`Phase change: ${data.phase}`);
    
    const phaseMessage = {
      type: 'phase_change',
      phase: data.phase,
      roomCode: this.roomCode
    };
    
    this.broadcastToAll(phaseMessage);
  }

  handleGameFinished(webSocket, data) {
    console.log(`Game finished: ${data.roomCode}`);
    
    const finishedMessage = {
      type: 'game_finished',
      roomCode: data.roomCode,
      message: data.message || 'Game has been finished'
    };
    
    this.broadcastToAll(finishedMessage);
  }

  handleAdminStateChange(webSocket, data) {
    console.log(`Admin state change: ${data.action}`);
    
    const adminMessage = {
      type: 'admin_state_change',
      roomCode: data.roomCode,
      action: data.action,
      details: data.details
    };
    
    this.broadcastToAll(adminMessage);
  }

  handleCountdown(webSocket, data) {
    console.log(`Countdown ${data.type}: ${data.countdown}s`);
    
    const countdownMessage = {
      type: data.type,
      roomCode: this.roomCode,
      countdown: data.countdown
    };
    
    this.broadcastToAll(countdownMessage);
  }

  handleClose(webSocket) {
    const userId = webSocket.userId;
    if (!userId) return;
    
    console.log(`User ${userId} disconnected`);
    
    // Remove from sessions
    this.sessions.delete(userId);
    
    // Notify other clients
    this.broadcastToOthers(userId, {
      type: 'user_left',
      userId: userId
    });
  }

  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    console.log(`Broadcasting to ${this.sessions.size} clients in room ${this.roomCode}:`, message);
    
    let successCount = 0;
    let errorCount = 0;
    
    this.sessions.forEach((webSocket, userId) => {
      try {
        webSocket.send(messageStr);
        successCount++;
        console.log(`Successfully sent message to ${userId}`);
      } catch (error) {
        console.error(`Error sending to ${userId}:`, error);
        this.sessions.delete(userId);
        errorCount++;
      }
    });
    
    console.log(`Broadcast complete: ${successCount} success, ${errorCount} errors`);
  }

  broadcastToOthers(excludeUserId, message) {
    const messageStr = JSON.stringify(message);
    this.sessions.forEach((webSocket, userId) => {
      if (userId !== excludeUserId) {
        try {
          webSocket.send(messageStr);
        } catch (error) {
          console.error(`Error sending to ${userId}:`, error);
          this.sessions.delete(userId);
        }
      }
    });
  }
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.pathname === '/') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Cloudflare Workers WebSocket'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // HTTP notification endpoint for admin actions
  if (url.pathname === '/notify' && request.method === 'POST') {
    try {
      const data = await request.json();
      console.log('Received HTTP notification:', data);
      
      if (!data.roomCode) {
        return new Response('Room code is required', { status: 400 });
      }
      
      // Get Durable Object for the room
      const durableObjectId = env.WEBSOCKET_DURABLE_OBJECT.idFromName(data.roomCode);
      const durableObject = env.WEBSOCKET_DURABLE_OBJECT.get(durableObjectId);
      
      // Forward the notification to the Durable Object
      const notifyRequest = new Request('https://dummy.com/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      await durableObject.fetch(notifyRequest);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Notification sent to room ${data.roomCode}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling notification:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // WebSocket upgrade
  if (request.headers.get('Upgrade') === 'websocket') {
    const roomCode = url.searchParams.get('roomCode');
    if (!roomCode) {
      return new Response('Room code is required', { status: 400 });
    }

    // Get Durable Object for this room
    const durableObjectId = env.WEBSOCKET_DURABLE_OBJECT.idFromName(roomCode);
    const durableObject = env.WEBSOCKET_DURABLE_OBJECT.get(durableObjectId);
    
    return durableObject.fetch(request);
  }
  
  return new Response('Not found', { status: 404 });
} 