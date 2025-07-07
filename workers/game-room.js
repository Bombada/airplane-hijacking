// GameRoom Durable Object
export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map(); // userId -> WebSocket
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/join') {
      return await this.handleJoin(request);
    } else if (path === '/broadcast') {
      return await this.handleBroadcast(request);
    } else if (path === '/websocket') {
      return await this.handleWebSocket(request);
    }

    return new Response('Not found', { status: 404 });
  }

  async handleJoin(request) {
    const { userId, action } = await request.json();
    
    // Store connection info (actual WebSocket connection will be handled separately)
    await this.state.storage.put(`user:${userId}`, {
      userId,
      joinedAt: Date.now(),
      active: true
    });

    return new Response('OK');
  }

  async handleBroadcast(request) {
    const { message, excludeUserId } = await request.json();
    
    // Get all active connections
    const allUsers = await this.state.storage.list({ prefix: 'user:' });
    
    // In a real implementation, you'd need to maintain WebSocket connections
    // This is a simplified version - you'd need to implement proper connection management
    
    return new Response('Broadcast sent');
  }

  async handleWebSocket(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    // Handle WebSocket connection
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        await this.handleMessage(server, data);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    server.addEventListener('close', async () => {
      await this.handleClose(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleMessage(server, data) {
    switch (data.type) {
      case 'join_room':
        await this.addConnection(data.userId, server);
        server.send(JSON.stringify({
          type: 'joined',
          roomCode: data.roomCode,
          userId: data.userId
        }));
        
        // Notify other clients
        await this.broadcastToOthers({
          type: 'user_joined',
          userId: data.userId
        }, data.userId);
        break;

      case 'player_action':
        await this.broadcastToOthers({
          type: 'player_action',
          userId: data.userId,
          action: data.action
        }, data.userId);
        break;

      case 'game_state_update':
        await this.broadcastToAll({
          type: 'game_state_update',
          gameState: data.gameState
        });
        break;

      case 'phase_change':
        await this.broadcastToAll({
          type: 'phase_change',
          phase: data.phase,
          roomCode: data.roomCode
        });
        break;

      case 'game_finished':
        await this.broadcastToAll({
          type: 'game_finished',
          roomCode: data.roomCode,
          message: data.message || 'Game has been finished'
        });
        break;

      case 'admin_state_change':
        await this.broadcastToAll({
          type: 'admin_state_change',
          roomCode: data.roomCode,
          action: data.action,
          details: data.details
        });
        break;
    }
  }

  async addConnection(userId, webSocket) {
    this.connections.set(userId, webSocket);
    
    // Store in persistent storage
    await this.state.storage.put(`user:${userId}`, {
      userId,
      joinedAt: Date.now(),
      active: true
    });
  }

  async removeConnection(userId) {
    this.connections.delete(userId);
    await this.state.storage.delete(`user:${userId}`);
  }

  async broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    
    for (const [userId, webSocket] of this.connections) {
      if (webSocket.readyState === 1) { // WebSocket.OPEN
        webSocket.send(messageStr);
      }
    }
  }

  async broadcastToOthers(message, excludeUserId) {
    const messageStr = JSON.stringify(message);
    
    for (const [userId, webSocket] of this.connections) {
      if (userId !== excludeUserId && webSocket.readyState === 1) {
        webSocket.send(messageStr);
      }
    }
  }

  async handleClose(server) {
    // Find and remove the connection
    for (const [userId, webSocket] of this.connections) {
      if (webSocket === server) {
        await this.removeConnection(userId);
        
        // Notify others
        await this.broadcastToOthers({
          type: 'user_left',
          userId
        }, userId);
        break;
      }
    }
  }
} 