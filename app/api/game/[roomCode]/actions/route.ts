import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId, actionType, airplaneId, cardId } = await request.json();
    const { roomCode } = await params;

    if (!userId || !actionType) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'User ID and action type are required'
      }, { status: 400 });
    }

    try {
      // Check game room
      const { data: gameRoom, error: roomError } = await supabaseServer
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError || !gameRoom) {
        throw new Error('Supabase room not found');
      }

      // Check player
      const { data: player, error: playerError } = await supabaseServer
        .from('players')
        .select('*')
        .eq('game_room_id', gameRoom.id)
        .eq('user_id', userId)
        .single();

      if (playerError || !player) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Player not found'
        }, { status: 404 });
      }

      // Get current round (only if game is playing and has started)
      let currentRound = null;
      if (gameRoom.status === 'playing' && gameRoom.current_round > 0) {
        const { data: roundData } = await supabaseServer
          .from('game_rounds')
          .select('*')
          .eq('game_room_id', gameRoom.id)
          .eq('round_number', gameRoom.current_round)
          .single();

        currentRound = roundData;
      }

      if (gameRoom.status === 'playing' && !currentRound) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Current round not found'
        }, { status: 404 });
      }

      switch (actionType) {
        case 'toggle_ready':
          // Toggle ready status
          const { error: readyError } = await supabaseServer
            .from('players')
            .update({ is_ready: !player.is_ready })
            .eq('id', player.id);

          if (readyError) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Failed to update ready status'
            }, { status: 500 });
          }

          return NextResponse.json<ApiResponse<null>>({
            message: 'Ready status updated'
          });

        case 'select_airplane':
          if (!airplaneId) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Airplane ID is required'
            }, { status: 400 });
          }

          if (!currentRound) {
            console.error('[Actions API] No current round found for airplane selection:', {
              gameRoomStatus: gameRoom.status,
              currentRoundNumber: gameRoom.current_round,
              gameRoomId: gameRoom.id
            });
            return NextResponse.json<ApiResponse<null>>({
              error: 'No active round found for airplane selection'
            }, { status: 400 });
          }

          // Select/change airplane
          console.log(`[Actions API] Attempting to upsert airplane selection:`, {
            player_id: player.id,
            game_round_id: currentRound?.id,
            action_type: 'select_airplane',
            airplane_id: airplaneId,
            currentRound: currentRound ? 'exists' : 'null'
          });

          const { error: airplaneError } = await supabaseServer
            .from('player_actions')
            .upsert({
              player_id: player.id,
              game_round_id: currentRound.id,
              action_type: 'select_airplane',
              airplane_id: airplaneId,
              action_time: new Date().toISOString()
            }, {
              onConflict: 'player_id,game_round_id'
            });

          if (airplaneError) {
            console.error('[Actions API] Airplane selection error:', airplaneError);
            return NextResponse.json<ApiResponse<null>>({
              error: `Failed to select airplane: ${airplaneError.message}`
            }, { status: 500 });
          }

          console.log(`[Actions API] Airplane selection successful for player ${player.id}`);
          return NextResponse.json<ApiResponse<null>>({
            message: 'Airplane selected'
          });

        case 'select_card':
          if (!cardId) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Card ID is required'
            }, { status: 400 });
          }

          if (!currentRound) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'No active round found for card selection'
            }, { status: 400 });
          }

          // Check if player already has an action for this round
          const { data: existingAction } = await supabaseServer
            .from('player_actions')
            .select('*')
            .eq('player_id', player.id)
            .eq('game_round_id', currentRound.id)
            .single();

          if (!existingAction) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Must select airplane before selecting card'
            }, { status: 400 });
          }

          // Update the existing action with card selection (allow changing card selection)
          const { error: cardError } = await supabaseServer
            .from('player_actions')
            .update({
              action_type: 'select_card',
              selected_card_id: cardId,
              action_time: new Date().toISOString()
            })
            .eq('player_id', player.id)
            .eq('game_round_id', currentRound.id);

          if (cardError) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Failed to select card'
            }, { status: 500 });
          }

          // NOTE: Don't mark card as used yet - wait until round ends
          // This allows players to see their cards during the round
          
          return NextResponse.json<ApiResponse<null>>({
            message: 'Card selected'
          });

        default:
          return NextResponse.json<ApiResponse<null>>({
            error: 'Invalid action type'
          }, { status: 400 });
      }

    } catch (supabaseError) {
      console.error('Supabase operation failed, using memory-based game state:', supabaseError);
      
      // Use memory-based game state
      const memoryGameRoom = mockGameState.getGameRoom(roomCode);
      if (!memoryGameRoom) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room not found'
        }, { status: 404 });
      }

      const player = mockGameState.getPlayer(userId, memoryGameRoom.id);
      if (!player) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Player not found'
        }, { status: 404 });
      }

      switch (actionType) {
        case 'toggle_ready':
          mockGameState.updatePlayer(player.id, { is_ready: !player.is_ready });
          return NextResponse.json<ApiResponse<null>>({
            message: 'Ready status updated (memory mode)'
          });

        case 'select_airplane':
          if (!airplaneId) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Airplane ID is required'
            }, { status: 400 });
          }

          if (memoryGameRoom.current_round > 0) {
            const currentRound = mockGameState.getCurrentRound(memoryGameRoom.id, memoryGameRoom.current_round);
            if (currentRound) {
              const action = mockGameState.addPlayerAction(player.id, currentRound.id, 'select_airplane', airplaneId);
              console.log(`[Actions API] Added airplane selection for player ${player.username} (${player.id}) -> airplane ${airplaneId}`);
              
              // Log current state
              const allActions = mockGameState.getAllRoundActions(currentRound.id);
              console.log(`[Actions API] Total actions in round: ${allActions.length}`);
              
              // Check if all players have selected airplanes and advance phase if needed
              const updatedRoom = mockGameState.checkAndAdvancePhase(roomCode);
              if (updatedRoom && updatedRoom.current_phase !== memoryGameRoom.current_phase) {
                console.log(`Phase advanced from ${memoryGameRoom.current_phase} to ${updatedRoom.current_phase}`);
              }
            }
          }

          return NextResponse.json<ApiResponse<null>>({
            message: 'Airplane selected (memory mode)'
          });

        case 'select_card':
          if (!cardId) {
            return NextResponse.json<ApiResponse<null>>({
              error: 'Card ID is required'
            }, { status: 400 });
          }

          if (memoryGameRoom.current_round > 0) {
            const currentRound = mockGameState.getCurrentRound(memoryGameRoom.id, memoryGameRoom.current_round);
            if (currentRound) {
              mockGameState.addPlayerAction(player.id, currentRound.id, 'select_card', undefined, cardId);
              
              // Check if all players have selected cards and advance phase if needed
              const updatedRoom = mockGameState.checkAndAdvancePhase(roomCode);
              if (updatedRoom && updatedRoom.current_phase !== memoryGameRoom.current_phase) {
                console.log(`Phase advanced from ${memoryGameRoom.current_phase} to ${updatedRoom.current_phase}`);
              }
            }
          }

          return NextResponse.json<ApiResponse<null>>({
            message: 'Card selected (memory mode)'
          });

        default:
          return NextResponse.json<ApiResponse<null>>({
            error: 'Invalid action type'
          }, { status: 400 });
      }
    }

  } catch (error) {
    console.error('Player action error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 