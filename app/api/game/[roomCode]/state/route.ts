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

      // 자동 시작 타이머 확인
      let autoStartTime = null;
      if (gameRoom.current_phase === 'waiting') {
        const hasMinPlayers = players.length >= 2;
        const allPlayersReady = players.every((p: any) => p.is_ready);
        
        if (hasMinPlayers && allPlayersReady) {
          // 모든 플레이어가 준비완료인 경우, 자동 시작 시간 설정
          if (!gameRoom.phase_start_time) {
            // 자동 시작 시간이 설정되지 않은 경우 설정
            const startTime = new Date().toISOString();
            await supabaseServer
              .from('game_rooms')
              .update({ phase_start_time: startTime })
              .eq('id', gameRoom.id);
            autoStartTime = startTime;
          } else {
            autoStartTime = gameRoom.phase_start_time;
          }
        } else {
          // 조건이 맞지 않으면 자동 시작 시간 제거
          if (gameRoom.phase_start_time) {
            await supabaseServer
              .from('game_rooms')
              .update({ phase_start_time: null })
              .eq('id', gameRoom.id);
          }
        }
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
          console.log(`[State API Supabase] Round ${currentRound.id}: Found ${airplanes?.length || 0} airplanes`);
          console.log(`[State API Supabase] Airplane data:`, airplanes);
        }

        // My cards info - only show unused cards
        const { data: cardData } = await supabaseServer
          .from('player_cards')
          .select('*')
          .eq('player_id', currentPlayer.id)
          .eq('is_used', false);

        myCards = cardData;
        
        // Debug log for card investigation
        console.log(`[State API Debug] Player ${currentPlayer.username} (${currentPlayer.id}) cards:`, {
          total_cards: myCards?.length || 0,
          card_types: myCards?.map(c => c.card_type) || [],
          card_ids: myCards?.map(c => c.id) || []
        });

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

      console.log(`[State API Supabase] Final response data:`, {
        gameRoom: gameRoom?.room_code,
        players: players?.length,
        currentPlayer: currentPlayer?.username,
        currentRound: currentRound?.round_number,
        airplanes: airplanes?.length,
        myCards: myCards?.length,
        myActions: myActions?.length,
        allPlayerActions: allPlayerActions?.length,
        autoStartTime
      });

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
          autoStartTime,
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

      // 자동 시작 타이머 확인 (메모리 모드)
      let autoStartTime = null;
      if (memoryGameRoom.current_phase === 'waiting') {
        const hasMinPlayers = players.length >= 2;
        const allPlayersReady = players.every((p: any) => p.is_ready);
        
        if (hasMinPlayers && allPlayersReady) {
          // 모든 플레이어가 준비완료인 경우, 자동 시작 시간 설정
          if (!memoryGameRoom.phase_start_time) {
            // 자동 시작 시간이 설정되지 않은 경우 설정
            const startTime = new Date().toISOString();
            memoryGameRoom.phase_start_time = startTime;
            autoStartTime = startTime;
          } else {
            autoStartTime = memoryGameRoom.phase_start_time;
          }
        } else {
          // 조건이 맞지 않으면 자동 시작 시간 제거
          if (memoryGameRoom.phase_start_time) {
            memoryGameRoom.phase_start_time = undefined;
          }
        }
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
          console.log(`[State API Memory] Round ${currentRound.id}: Found ${airplanes?.length || 0} airplanes`);
          console.log(`[State API Memory] Airplane data:`, airplanes);
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

      console.log(`[State API Memory] Final response data:`, {
        gameRoom: memoryGameRoom?.room_code,
        players: players?.length,
        currentPlayer: currentPlayer?.username,
        currentRound: currentRound?.round_number,
        airplanes: airplanes?.length,
        myCards: myCards?.length,
        myActions: myActions?.length,
        allPlayerActions: allPlayerActions?.length,
        autoStartTime
      });

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
          autoStartTime,
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