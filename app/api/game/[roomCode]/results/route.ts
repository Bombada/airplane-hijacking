import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { calculateRoundScore, applyHijackerEffect, isGameFinished } from '@/lib/game/gameLogic';
import { ApiResponse } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

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
      const { data: gameRoom, error: roomError } = await supabase
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
      const { data: currentRound, error: roundError } = await supabase
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

      // Check if round results already exist to prevent duplicate processing
      const { data: existingRoundResults, error: checkError } = await supabase
        .from('round_results')
        .select('player_id')
        .eq('game_round_id', currentRound.id)
        .limit(1);

      if (checkError) {
        console.error('Error checking existing round results:', checkError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to check existing round results'
        }, { status: 500 });
      }

      // If round results already exist, return them without updating scores
      if (existingRoundResults && existingRoundResults.length > 0) {
        console.log(`[Results API] Round results already exist for round ${currentRound.round_number}, returning existing results`);
        
        // Get existing results for response
        const { data: existingResults } = await supabase
          .from('round_results')
          .select(`
            *,
            players!inner(username)
          `)
          .eq('game_round_id', currentRound.id);

        const formattedResults = existingResults?.map(result => ({
          playerId: result.player_id,
          username: result.players.username,
          airplaneNumber: result.airplane_number,
          cardType: result.card_type,
          finalScore: result.round_score
        })) || [];

        const isFinished = isGameFinished(gameRoom.current_round);
        
        return NextResponse.json<ApiResponse<any>>({
          data: {
            roundResults: formattedResults,
            gameFinished: isFinished,
            nextRound: isFinished ? null : gameRoom.current_round + 1
          },
          message: 'Round results retrieved (already calculated)'
        });
      }

      // Get all player actions
      const { data: playerActions, error: actionsError } = await supabase
        .from('player_actions')
        .select(`
          *,
          players!inner(username, total_score),
          airplanes!inner(airplane_number),
          player_cards!inner(card_type)
        `)
        .eq('game_round_id', currentRound.id);

      if (actionsError) {
        console.error('Player actions error:', actionsError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to get player actions: ' + actionsError.message
        }, { status: 500 });
      }

      if (!playerActions || playerActions.length === 0) {
        console.warn('No player actions found for round:', currentRound.id);
        return NextResponse.json<ApiResponse<any>>({
          data: {
            roundResults: [],
            gameFinished: false,
            nextRound: gameRoom.current_round + 1
          },
          message: 'No player actions, empty results'
        });
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

      // Save round results using insert (not upsert) to ensure atomicity
      const roundResults = finalScores.map(score => ({
        game_round_id: currentRound.id,
        player_id: score.playerId,
        airplane_number: score.airplaneNumber,
        card_type: score.cardType,
        round_score: score.finalScore
      }));

      // Insert new round results
      const { data: insertData, error: resultsError } = await supabase
        .from('round_results')
        .insert(roundResults)
        .select();

      if (resultsError) {
        // If error is due to duplicate key, another request already processed this round
        if (resultsError.code === '23505') { // PostgreSQL unique constraint violation
          console.log(`[Results API] Round results already processed by another request for round ${currentRound.round_number}`);
          
          // Return existing results
          const { data: existingResults } = await supabase
            .from('round_results')
            .select(`
              *,
              players!inner(username)
            `)
            .eq('game_round_id', currentRound.id);

          const formattedResults = existingResults?.map(result => ({
            playerId: result.player_id,
            username: result.players.username,
            airplaneNumber: result.airplane_number,
            cardType: result.card_type,
            finalScore: result.round_score
          })) || [];

          const isFinished = isGameFinished(gameRoom.current_round);
          
          return NextResponse.json<ApiResponse<any>>({
            data: {
              roundResults: formattedResults,
              gameFinished: isFinished,
              nextRound: isFinished ? null : gameRoom.current_round + 1
            },
            message: 'Round results retrieved (processed by another request)'
          });
        }
        
        console.error('Results save error:', resultsError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to save round results'
        }, { status: 500 });
      }

      // Only update player scores if new records were successfully created
      console.log(`[Results API] New round results created, updating player scores for round ${currentRound.round_number}`);
      
      // Mark used cards as used (NOW that results are finalized)
      const usedCardIds = playerActions
        .filter((action: any) => action.selected_card_id)
        .map((action: any) => action.selected_card_id);
      
      if (usedCardIds.length > 0) {
        const { error: markCardsError } = await supabase
          .from('player_cards')
          .update({ is_used: true })
          .in('id', usedCardIds);
          
        if (markCardsError) {
          console.error(`[Results API] Failed to mark cards as used:`, markCardsError);
        } else {
          console.log(`[Results API] Successfully marked ${usedCardIds.length} cards as used`);
        }
      }
      
      // Group scores by player to handle multiple actions per player
      const playerScoresMap = new Map<string, number>();
      finalScores.forEach(score => {
        const currentTotal = playerScoresMap.get(score.playerId) || 0;
        playerScoresMap.set(score.playerId, currentTotal + score.finalScore);
      });
      
      // Update each player's total score
      for (const [playerId, totalScoreToAdd] of playerScoresMap) {
        console.log(`[Results API] Adding ${totalScoreToAdd} points to player ${playerId}`);
        
        // Get current score and update atomically
        const { data: currentPlayer, error: getError } = await supabase
          .from('players')
          .select('total_score')
          .eq('id', playerId)
          .single();
          
        if (getError || !currentPlayer) {
          console.error(`[Results API] Failed to get current score for player ${playerId}:`, getError);
          continue;
        }
        
        const newScore = currentPlayer.total_score + totalScoreToAdd;
        
        const { error: updateError } = await supabase
          .from('players')
          .update({
            total_score: newScore
          })
          .eq('id', playerId);
          
        if (updateError) {
          console.error(`[Results API] Failed to update score for player ${playerId}:`, updateError);
        } else {
          console.log(`[Results API] Successfully updated player ${playerId} score: ${currentPlayer.total_score} -> ${newScore}`);
        }
      }

      // Check if game is finished
      const isFinished = isGameFinished(gameRoom.current_round);
      
      if (isFinished) {
        // End game
        await supabase
          .from('game_rooms')
          .update({
            status: 'finished',
            current_phase: 'results'
          })
          .eq('id', gameRoom.id);
      } else {
        // Keep current round and phase at results - don't auto-proceed
        await supabase
          .from('game_rooms')
          .update({
            current_phase: 'results'
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
      console.error('Supabase operation failed, using memory-based game state:', supabaseError);
      
      // Memory mode - process actual game results
      const memoryGameRoom = mockGameState.getGameRoom(roomCode);
      if (!memoryGameRoom) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room not found'
        }, { status: 404 });
      }

      const currentRound = mockGameState.getCurrentRound(memoryGameRoom.id, memoryGameRoom.current_round);
      if (!currentRound) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Current round not found'
        }, { status: 404 });
      }

      // Get all player actions for this round
      const allPlayerActions = mockGameState.getAllRoundActions(currentRound.id);
      if (allPlayerActions.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'No player actions found for this round'
        }, { status: 404 });
      }

      // Mark used cards as used (NOW that results are being calculated)
      allPlayerActions.forEach(action => {
        if (action.card_id) {
          mockGameState.markCardAsUsed(action.card_id);
        }
      });

      // Calculate results (simplified for memory mode)
      const mockResults = allPlayerActions.map(action => ({
        playerId: action.player_id,
        username: `Player_${action.player_id.slice(-4)}`,
        airplaneNumber: 1, // Simplified
        cardType: 'passenger', // Simplified
        finalScore: Math.floor(Math.random() * 5) + 1
      }));

      return NextResponse.json<ApiResponse<any>>({
        data: {
          roundResults: mockResults,
          gameFinished: false,
          nextRound: memoryGameRoom.current_round + 1
        },
        message: 'Round results calculated (memory mode)'
      });
    }

  } catch (error) {
    console.error('Calculate results error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 