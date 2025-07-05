import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'User ID is required'
      }, { status: 400 });
    }

    const { roomCode } = await params;

    if (!roomCode) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Room code is required'
      }, { status: 400 });
    }

    try {
      // Try to get game room info from Supabase
      const { data: gameRoom, error: roomError } = await supabaseServer
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError || !gameRoom) {
        throw new Error('Supabase room not found');
      }

      // Get players list
      const { data: players, error: playersError } = await supabaseServer
        .from('players')
        .select('*')
        .eq('game_room_id', gameRoom.id);

      if (playersError) {
        throw new Error(`Players error: ${playersError.message}`);
      }

      // Find current player
      const currentPlayer = players?.find((p: any) => p.user_id === userId);

      if (!currentPlayer) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Player not found in this game'
        }, { status: 404 });
      }

      let currentRound = null;
      let airplanes = null;
      let myCards = null;
      let myActions = null;
      let allPlayerActions = null;

      // Get additional info if game is playing
      if (gameRoom.status === 'playing' && gameRoom.current_round > 0) {
        // Current round info
        const { data: roundData, error: roundError } = await supabaseServer
          .from('game_rounds')
          .select('*')
          .eq('game_room_id', gameRoom.id)
          .eq('round_number', gameRoom.current_round)
          .single();

        if (!roundError && roundData) {
          currentRound = roundData;
        }

        // Airplane info
        if (currentRound) {
          const { data: airplaneData } = await supabaseServer
            .from('airplanes')
            .select('*')
            .eq('game_round_id', currentRound.id)
            .order('airplane_number', { ascending: true });

          airplanes = airplaneData;
        }

        // My cards info
        const { data: cardData } = await supabaseServer
          .from('player_cards')
          .select('*')
          .eq('player_id', currentPlayer.id)
          .eq('is_used', false);

        myCards = cardData;

        // My actions info (current round)
        if (currentRound) {
          const { data: actionData } = await supabaseServer
            .from('player_actions')
            .select('*')
            .eq('player_id', currentPlayer.id)
            .eq('game_round_id', currentRound.id);

          myActions = actionData;
          
          // Get all player actions for this round
          const { data: allActionData } = await supabaseServer
            .from('player_actions')
            .select('*')
            .eq('game_round_id', currentRound.id);
            
          allPlayerActions = allActionData;
          console.log(`[State API Supabase] Round ${currentRound.id}: Found ${allPlayerActions?.length || 0} total actions`);
        }
      }

      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom,
          players,
          currentPlayer,
          currentRound,
          airplanes,
          myCards,
          myActions,
          allPlayerActions,
          hasActiveTimer: mockGameState.hasActiveTimer(roomCode)
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
      const currentPlayer = mockGameState.getPlayer(userId, memoryGameRoom.id);

      if (!currentPlayer) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Player not found in this game'
        }, { status: 404 });
      }

      let currentRound = null;
      let airplanes = null;
      let myCards = null;
      let myActions = null;
      let allPlayerActions = null;

      // Get additional info if game is playing
      if (memoryGameRoom.status === 'playing' && memoryGameRoom.current_round > 0) {
        currentRound = mockGameState.getCurrentRound(memoryGameRoom.id, memoryGameRoom.current_round);
        
        if (currentRound) {
          airplanes = mockGameState.getAirplanes(currentRound.id);
          myActions = mockGameState.getPlayerActions(currentPlayer.id, currentRound.id);
          // Get all player actions for this round to show who selected what
          allPlayerActions = mockGameState.getAllRoundActions(currentRound.id);
          console.log(`[State API] Round ${currentRound.id}: Found ${allPlayerActions.length} total actions`);
          console.log(`[State API] All actions:`, allPlayerActions.map(a => ({
            player_id: a.player_id,
            action_type: a.action_type,
            airplane_id: a.airplane_id
          })));
        }

        myCards = mockGameState.getPlayerCards(currentPlayer.id);
      }

      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom: memoryGameRoom,
          players,
          currentPlayer,
          currentRound,
          airplanes,
          myCards,
          myActions,
          allPlayerActions,
          hasActiveTimer: mockGameState.hasActiveTimer(roomCode)
        },
        message: 'Game state retrieved (memory mode - real multiplayer)'
      });
    }

  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 