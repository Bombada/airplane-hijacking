import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { calculateRoundScore, applyHijackerEffect, isGameFinished } from '@/lib/game/gameLogic';
import { ApiResponse } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await request.json();
    const { roomCode } = await params;

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'User ID is required'
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
        // Mock mode - return mock results
        return NextResponse.json<ApiResponse<any>>({
          data: {
            roundResults: [
              {
                playerId: userId,
                username: 'Mock Player',
                airplaneNumber: 1,
                cardType: 'passenger',
                finalScore: 5
              }
            ],
            gameFinished: false,
            nextRound: 2
          },
          message: 'Round results calculated (mock mode)'
        });
      }

      // Get current round
      const { data: currentRound, error: roundError } = await supabaseServer
        .from('game_rounds')
        .select('*')
        .eq('game_room_id', gameRoom.id)
        .eq('round_number', gameRoom.current_round)
        .single();

      if (roundError || !currentRound) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Current round not found'
        }, { status: 404 });
      }

      // Get all player actions
      const { data: playerActions, error: actionsError } = await supabaseServer
        .from('player_actions')
        .select(`
          *,
          players!inner(username, total_score),
          airplanes!inner(airplane_number),
          player_cards!inner(card_type)
        `)
        .eq('game_round_id', currentRound.id);

      if (actionsError || !playerActions) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to get player actions'
        }, { status: 500 });
      }

      // Calculate passengers per airplane
      const airplanePassengers: Record<number, number> = {};
      
      playerActions.forEach((action: any) => {
        const airplaneNumber = action.airplanes.airplane_number;
        const cardType = action.player_cards.card_type;
        
        if (cardType === 'passenger') {
          airplanePassengers[airplaneNumber] = (airplanePassengers[airplaneNumber] || 0) + 1;
        }
      });

      // Calculate base scores for each player
      const playerScores = playerActions.map((action: any) => ({
        playerId: action.player_id,
        username: action.players.username,
        airplaneNumber: action.airplanes.airplane_number,
        cardType: action.player_cards.card_type,
        baseScore: calculateRoundScore(
          airplanePassengers,
          action.airplanes.airplane_number,
          action.player_cards.card_type
        )
      }));

      // Apply hijacker effects
      const finalScores = applyHijackerEffect(playerScores);

      // Save round results
      const roundResults = finalScores.map(score => ({
        game_round_id: currentRound.id,
        player_id: score.playerId,
        airplane_number: score.airplaneNumber,
        card_type: score.cardType,
        round_score: score.finalScore
      }));

      const { error: resultsError } = await supabaseServer
        .from('round_results')
        .insert(roundResults);

      if (resultsError) {
        console.error('Results save error:', resultsError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to save round results'
        }, { status: 500 });
      }

      // Update player total scores
      for (const score of finalScores) {
        // Get current score and add
        const { data: player } = await supabaseServer
          .from('players')
          .select('total_score')
          .eq('id', score.playerId)
          .single();
        
        if (player) {
          await supabaseServer
            .from('players')
            .update({
              total_score: player.total_score + score.finalScore
            })
            .eq('id', score.playerId);
        }
      }

      // Check if game is finished
      const isFinished = isGameFinished(gameRoom.current_round);
      
      if (isFinished) {
        // End game
        await supabaseServer
          .from('game_rooms')
          .update({
            status: 'finished',
            current_phase: 'results'
          })
          .eq('id', gameRoom.id);
      } else {
        // Proceed to next round
        const nextRound = gameRoom.current_round + 1;
        
        // Create new round
        const { data: newRound } = await supabaseServer
          .from('game_rounds')
          .insert({
            game_room_id: gameRoom.id,
            round_number: nextRound,
            phase: 'airplane_selection'
          })
          .select()
          .single();

        if (newRound) {
          // Create new airplanes
          const airplaneInserts = [1, 2, 3, 4].map(num => ({
            game_round_id: newRound.id,
            airplane_number: num
          }));

          await supabaseServer
            .from('airplanes')
            .insert(airplaneInserts);
        }

        // Update game room
        await supabaseServer
          .from('game_rooms')
          .update({
            current_round: nextRound,
            current_phase: 'airplane_selection',
            phase_start_time: new Date().toISOString()
          })
          .eq('id', gameRoom.id);
      }

      return NextResponse.json<ApiResponse<any>>({
        data: {
          roundResults: finalScores,
          gameFinished: isFinished,
          nextRound: isFinished ? null : gameRoom.current_round + 1
        }
      });

    } catch (supabaseError) {
      console.error('Supabase operation failed:', supabaseError);
      
      // Mock mode - return mock results
      return NextResponse.json<ApiResponse<any>>({
        data: {
          roundResults: [
            {
              playerId: userId,
              username: 'Mock Player',
              airplaneNumber: 1,
              cardType: 'passenger',
              finalScore: 5
            }
          ],
          gameFinished: false,
          nextRound: 2
        },
        message: 'Round results calculated (mock mode - Supabase unavailable)'
      });
    }

  } catch (error) {
    console.error('Calculate results error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 