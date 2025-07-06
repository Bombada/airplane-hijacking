import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generatePlayerCards, generateAirplaneNumbers } from '@/lib/game/gameLogic';
import { ApiResponse } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, userId } = await request.json();

    if (!roomCode || !userId) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Room code and userId are required'
      }, { status: 400 });
    }

    try {
      // Check game room and host permissions
      const { data: gameRoom, error: roomError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players!inner(user_id, username)
        `)
        .eq('room_code', roomCode)
        .eq('status', 'waiting')
        .single();

      if (roomError || !gameRoom) {
        throw new Error('Supabase room not found');
      }

      // Check if user is the host (first player)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_room_id', gameRoom.id);

      if (playersError || !players || players.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'No players found'
        }, { status: 404 });
      }

      const hostPlayer = players[0];
      if (hostPlayer.user_id !== userId) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Only the host can start the game'
        }, { status: 403 });
      }

      // Check minimum player count (at least 2)
      if (players.length < 2) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'At least 2 players required to start the game'
        }, { status: 400 });
      }

      // Check if all players are ready
      const allReady = players.every((p: any) => p.is_ready);
      if (!allReady) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'All players must be ready to start the game'
        }, { status: 400 });
      }

      // Clear existing cards for all players in this game
      const { error: clearCardsError } = await supabase
        .from('player_cards')
        .delete()
        .in('player_id', players.map(p => p.id));

      if (clearCardsError) {
        console.error('Cards clearing error:', clearCardsError);
        // Continue anyway - this might be the first time starting
      }

      // Distribute fresh cards to each player
      const cardInserts = [];
      for (let i = 0; i < players.length; i++) {
        const playerCardSet = generatePlayerCards(); // Generate new card set for each player
        for (const cardType of playerCardSet) {
          cardInserts.push({
            player_id: players[i].id,
            card_type: cardType,
            is_used: false
          });
        }
      }

      const { error: cardsError } = await supabase
        .from('player_cards')
        .insert(cardInserts);

      if (cardsError) {
        console.error('Cards creation error:', cardsError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to distribute cards'
        }, { status: 500 });
      }

      // Create first round
      const { data: round, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
          game_room_id: gameRoom.id,
          round_number: 1,
          phase: 'airplane_selection'
        })
        .select()
        .single();

      if (roundError) {
        console.error('Round creation error:', roundError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to create first round'
        }, { status: 500 });
      }

      // Update game room status
      const { data: updatedRoom, error: updateError } = await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          current_round: 1,
          current_phase: 'airplane_selection',
          phase_start_time: new Date().toISOString()
        })
        .eq('id', gameRoom.id)
        .select()
        .single();

      if (updateError) {
        console.error('Room update error:', updateError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to start game'
        }, { status: 500 });
      }

      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom: updatedRoom,
          round: round,
          players: players.length,
          message: 'Game started successfully'
        }
      });

    } catch (supabaseError) {
      console.error('Supabase operation failed, using memory-based game state:', supabaseError);
      
      // Use memory-based game state
      const memoryGameRoom = mockGameState.getGameRoom(roomCode);
      if (!memoryGameRoom) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room not found'
        }, { status: 404 });
      }

      const players = mockGameState.getPlayers(memoryGameRoom.id);
      const hostPlayer = mockGameState.getHostPlayer(memoryGameRoom.id);

      if (!hostPlayer || hostPlayer.user_id !== userId) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Only the host can start the game'
        }, { status: 403 });
      }

      if (players.length < 2) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'At least 2 players required to start the game'
        }, { status: 400 });
      }

      if (!mockGameState.getAllPlayersReady(memoryGameRoom.id)) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'All players must be ready to start the game'
        }, { status: 400 });
      }

      // Clear existing cards for all players
      for (const player of players) {
        mockGameState.clearPlayerCards(player.id);
      }

      // Distribute fresh cards to each player
      for (const player of players) {
        const playerCardSet = generatePlayerCards();
        mockGameState.addPlayerCards(player.id, playerCardSet);
      }

      // Create first round
      const round = mockGameState.createRound(memoryGameRoom.id, 1);

      // Create airplanes
      const airplaneNumbers = generateAirplaneNumbers();
      mockGameState.createAirplanes(round.id, airplaneNumbers);

      // Update game room status
      const updatedRoom = mockGameState.updateGameRoom(roomCode, {
        status: 'playing',
        current_round: 1,
        current_phase: 'airplane_selection',
        phase_start_time: new Date().toISOString()
      });

      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom: updatedRoom,
          round: round,
          players: players.length,
          message: 'Game started successfully (memory mode - real multiplayer)'
        }
      });
    }

  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
