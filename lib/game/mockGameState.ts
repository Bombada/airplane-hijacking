// Memory-based game state for real multiplayer functionality
interface MockPlayer {
  id: string;
  game_room_id: string;
  user_id: string;
  username: string;
  total_score: number;
  is_ready: boolean;
  created_at: string;
}

interface MockGameRoom {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  current_phase: string;
  created_at: string;
  updated_at: string;
  phase_start_time?: string;
}

interface MockRound {
  id: string;
  game_room_id: string;
  round_number: number;
  phase: string;
}

interface MockAirplane {
  id: string;
  game_round_id: string;
  airplane_number: number;
  passenger_count?: number;
}

interface MockPlayerCard {
  id: string;
  player_id: string;
  card_type: string;
  is_used: boolean;
}

interface MockPlayerAction {
  id: string;
  player_id: string;
  game_round_id: string;
  action_type: string;
  airplane_id?: string;
  card_id?: string;
}

class MockGameState {
  private gameRooms: Map<string, MockGameRoom> = new Map();
  private players: Map<string, MockPlayer[]> = new Map(); // roomId -> players
  private rounds: Map<string, MockRound[]> = new Map(); // roomId -> rounds
  private airplanes: Map<string, MockAirplane[]> = new Map(); // roundId -> airplanes
  private playerCards: Map<string, MockPlayerCard[]> = new Map(); // playerId -> cards
  private playerActions: Map<string, MockPlayerAction[]> = new Map(); // roundId -> actions
  private phaseTimers: Map<string, NodeJS.Timeout> = new Map(); // roomCode -> timer

  // Game Room operations
  createGameRoom(roomCode: string): MockGameRoom {
    const gameRoom: MockGameRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      room_code: roomCode,
      status: 'waiting',
      current_round: 0,
      current_phase: 'waiting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.gameRooms.set(roomCode, gameRoom);
    this.players.set(gameRoom.id, []);
    return gameRoom;
  }

  getGameRoom(roomCode: string): MockGameRoom | null {
    return this.gameRooms.get(roomCode) || null;
  }

  updateGameRoom(roomCode: string, updates: Partial<MockGameRoom>): MockGameRoom | null {
    const gameRoom = this.gameRooms.get(roomCode);
    if (!gameRoom) return null;

    const updatedRoom = { ...gameRoom, ...updates, updated_at: new Date().toISOString() };
    this.gameRooms.set(roomCode, updatedRoom);
    return updatedRoom;
  }

  // Player operations
  addPlayer(gameRoomId: string, userId: string, username: string): MockPlayer {
    const player: MockPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      game_room_id: gameRoomId,
      user_id: userId,
      username: username,
      total_score: 0,
      is_ready: false,
      created_at: new Date().toISOString()
    };

    const roomPlayers = this.players.get(gameRoomId) || [];
    roomPlayers.push(player);
    this.players.set(gameRoomId, roomPlayers);
    
    return player;
  }

  getPlayers(gameRoomId: string): MockPlayer[] {
    return this.players.get(gameRoomId) || [];
  }

  updatePlayer(playerId: string, updates: Partial<MockPlayer>): MockPlayer | null {
    for (const [roomId, players] of this.players.entries()) {
      const playerIndex = players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        players[playerIndex] = { ...players[playerIndex], ...updates };
        return players[playerIndex];
      }
    }
    return null;
  }

  getPlayer(userId: string, gameRoomId: string): MockPlayer | null {
    const players = this.players.get(gameRoomId) || [];
    return players.find(p => p.user_id === userId) || null;
  }

  // Round operations
  createRound(gameRoomId: string, roundNumber: number): MockRound {
    const round: MockRound = {
      id: `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      game_room_id: gameRoomId,
      round_number: roundNumber,
      phase: 'airplane_selection'
    };

    const roomRounds = this.rounds.get(gameRoomId) || [];
    roomRounds.push(round);
    this.rounds.set(gameRoomId, roomRounds);

    return round;
  }

  getCurrentRound(gameRoomId: string, roundNumber: number): MockRound | null {
    const rounds = this.rounds.get(gameRoomId) || [];
    return rounds.find(r => r.round_number === roundNumber) || null;
  }

  // Airplane operations
  createAirplanes(roundId: string, airplaneNumbers: number[]): MockAirplane[] {
    const airplanes: MockAirplane[] = airplaneNumbers.map(num => ({
      id: `airplane-${Date.now()}-${num}-${Math.random().toString(36).substr(2, 9)}`,
      game_round_id: roundId,
      airplane_number: num,
      passenger_count: Math.floor(Math.random() * 8) + 1 // 1-8 passengers
    }));

    this.airplanes.set(roundId, airplanes);
    return airplanes;
  }

  getAirplanes(roundId: string): MockAirplane[] {
    return this.airplanes.get(roundId) || [];
  }

  // Player Cards operations
  addPlayerCards(playerId: string, cardTypes: string[]): MockPlayerCard[] {
    const cards: MockPlayerCard[] = cardTypes.map(cardType => ({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      player_id: playerId,
      card_type: cardType,
      is_used: false
    }));

    this.playerCards.set(playerId, cards);
    return cards;
  }

  getPlayerCards(playerId: string): MockPlayerCard[] {
    return this.playerCards.get(playerId) || [];
  }

  // Player Actions operations
  addPlayerAction(playerId: string, roundId: string, actionType: string, airplaneId?: string, cardId?: string): MockPlayerAction {
    console.log(`[MockGameState] Adding action: player=${playerId}, round=${roundId}, type=${actionType}, airplane=${airplaneId}`);
    
    const roundActions = this.playerActions.get(roundId) || [];
    console.log(`[MockGameState] Current actions for round ${roundId}:`, roundActions.length);
    
    // Check if player already has an action of this type for this round
    const existingActionIndex = roundActions.findIndex(a => 
      a.player_id === playerId && a.action_type === actionType
    );

    const action: MockPlayerAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player_id: playerId,
      game_round_id: roundId,
      action_type: actionType,
      airplane_id: airplaneId,
      card_id: cardId
    };

    if (existingActionIndex >= 0) {
      // Update existing action
      roundActions[existingActionIndex] = action;
      console.log(`[MockGameState] Updated existing ${actionType} action for player ${playerId}`);
    } else {
      // Add new action
      roundActions.push(action);
      console.log(`[MockGameState] Added new ${actionType} action for player ${playerId}`);
    }

    this.playerActions.set(roundId, roundActions);
    console.log(`[MockGameState] Total actions in round ${roundId} after update:`, roundActions.length);
    
    return action;
  }

  getPlayerActions(playerId: string, roundId: string): MockPlayerAction[] {
    const roundActions = this.playerActions.get(roundId) || [];
    return roundActions.filter(a => a.player_id === playerId);
  }

  // Utility methods
  roomExists(roomCode: string): boolean {
    return this.gameRooms.has(roomCode);
  }

  getPlayerCount(gameRoomId: string): number {
    return this.players.get(gameRoomId)?.length || 0;
  }

  getAllPlayersReady(gameRoomId: string): boolean {
    const players = this.players.get(gameRoomId) || [];
    return players.length > 0 && players.every(p => p.is_ready);
  }

  getHostPlayer(gameRoomId: string): MockPlayer | null {
    const players = this.players.get(gameRoomId) || [];
    return players[0] || null; // First player is host
  }

  // Phase transition methods
  getAllRoundActions(roundId: string): MockPlayerAction[] {
    const actions = this.playerActions.get(roundId) || [];
    console.log(`[MockGameState] getAllRoundActions for round ${roundId}: ${actions.length} actions found`);
    return actions;
  }

  checkAllPlayersSelectedAirplane(gameRoomId: string, roundId: string): boolean {
    const players = this.getPlayers(gameRoomId);
    const roundActions = this.getAllRoundActions(roundId);
    
    // Check if every player has selected an airplane
    return players.every(player => 
      roundActions.some(action => 
        action.player_id === player.id && 
        action.action_type === 'select_airplane' && 
        action.airplane_id
      )
    );
  }

  checkAllPlayersSelectedCard(gameRoomId: string, roundId: string): boolean {
    const players = this.getPlayers(gameRoomId);
    const roundActions = this.getAllRoundActions(roundId);
    
    // Check if every player has selected a card
    return players.every(player => 
      roundActions.some(action => 
        action.player_id === player.id && 
        action.action_type === 'select_card' && 
        action.card_id
      )
    );
  }

  advancePhase(roomCode: string): MockGameRoom | null {
    const gameRoom = this.getGameRoom(roomCode);
    if (!gameRoom || gameRoom.status !== 'playing') {
      return null;
    }

    const currentRound = this.getCurrentRound(gameRoom.id, gameRoom.current_round);
    if (!currentRound) {
      return null;
    }

    let nextPhase: string;
    
    switch (gameRoom.current_phase) {
      case 'airplane_selection':
        nextPhase = 'discussion';
        break;
      case 'discussion':
        nextPhase = 'card_selection';
        break;
      case 'card_selection':
        nextPhase = 'results';
        break;
      case 'results':
        // Move to next round or finish game
        if (gameRoom.current_round >= 5) {
          return this.updateGameRoom(roomCode, {
            status: 'finished',
            current_phase: 'finished'
          });
        } else {
          // Create next round
          const nextRoundNumber = gameRoom.current_round + 1;
          const newRound = this.createRound(gameRoom.id, nextRoundNumber);
          this.createAirplanes(newRound.id, [1, 2, 3, 4]); // Create airplanes for the new round
          
          return this.updateGameRoom(roomCode, {
            current_round: nextRoundNumber,
            current_phase: 'airplane_selection',
            phase_start_time: new Date().toISOString()
          });
        }
      default:
        return null;
    }

    return this.updateGameRoom(roomCode, {
      current_phase: nextPhase,
      phase_start_time: new Date().toISOString()
    });
  }

  checkAndAdvancePhase(roomCode: string): MockGameRoom | null {
    const gameRoom = this.getGameRoom(roomCode);
    if (!gameRoom || gameRoom.status !== 'playing') {
      return null;
    }

    const currentRound = this.getCurrentRound(gameRoom.id, gameRoom.current_round);
    if (!currentRound) {
      return null;
    }

    let shouldAdvance = false;

    switch (gameRoom.current_phase) {
      case 'airplane_selection':
        shouldAdvance = this.checkAllPlayersSelectedAirplane(gameRoom.id, currentRound.id);
        if (shouldAdvance) {
          // Start 5-second timer before advancing
          this.startPhaseTimer(roomCode, 5000);
          return gameRoom; // Don't advance immediately
        }
        break;
      case 'discussion':
        // Auto-advance after 30 seconds (for now, just advance immediately)
        shouldAdvance = true;
        break;
      case 'card_selection':
        shouldAdvance = this.checkAllPlayersSelectedCard(gameRoom.id, currentRound.id);
        if (shouldAdvance) {
          // Start 5-second timer before advancing
          this.startPhaseTimer(roomCode, 5000);
          return gameRoom; // Don't advance immediately
        }
        break;
      case 'results':
        // Auto-advance after showing results (for now, just advance immediately)
        shouldAdvance = true;
        break;
    }

    if (shouldAdvance) {
      return this.advancePhase(roomCode);
    }

    return gameRoom;
  }

  // Timer methods
  startPhaseTimer(roomCode: string, delay: number): void {
    // Clear existing timer if any
    this.clearPhaseTimer(roomCode);

    console.log(`Starting ${delay/1000}s timer for room ${roomCode}`);
    
    const timer = setTimeout(() => {
      console.log(`Timer expired for room ${roomCode}, advancing phase`);
      this.advancePhase(roomCode);
      this.clearPhaseTimer(roomCode);
    }, delay);

    this.phaseTimers.set(roomCode, timer);
  }

  clearPhaseTimer(roomCode: string): void {
    const timer = this.phaseTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.phaseTimers.delete(roomCode);
      console.log(`Cleared timer for room ${roomCode}`);
    }
  }

  hasActiveTimer(roomCode: string): boolean {
    return this.phaseTimers.has(roomCode);
  }
}

// Global singleton instance
const mockGameState = new MockGameState();

export default mockGameState; 