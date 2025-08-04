export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';

// Function to send game finished notification via HTTP
async function sendGameFinishedNotification(roomCode: string) {
  return new Promise<void>((resolve) => {
    try {
      console.log(`[Admin] Sending game finished notification for room ${roomCode} via HTTP`);
      
      // Send notification to Cloudflare Workers WebSocket server via HTTP
      fetch('https://airplane-hijacking-websocket-v2.affectome22.workers.dev/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'game_finished',
          roomCode: roomCode,
          message: 'Game has been finished by admin'
        })
      }).then(response => {
        if (response.ok) {
          console.log(`[Admin] Successfully sent game finished notification for room ${roomCode}`);
        } else {
          console.error(`[Admin] Failed to send notification: ${response.status}`);
        }
        resolve();
      }).catch(error => {
        console.error('[Admin] Error sending HTTP notification:', error);
        resolve(); // Don't fail the API call
      });
    } catch (error) {
      console.error('[Admin] Error in sendGameFinishedNotification:', error);
      resolve(); // Don't fail the API call
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = await params;

    // Get game room
    const { data: gameRoom, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !gameRoom) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Game room not found'
      }, { status: 404 });
    }

    // Check if game is already finished
    if (gameRoom.status === 'finished') {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Game is already finished'
      }, { status: 400 });
    }

    // Before finishing the game, ensure all completed rounds have their scores calculated
    try {
      // Get all completed rounds (rounds where all players have taken actions)
      const { data: gameRounds, error: roundsError } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('game_room_id', gameRoom.id)
        .order('round_number', { ascending: true });

      if (roundsError) {
        console.error('Error fetching rounds:', roundsError);
      } else if (gameRounds && gameRounds.length > 0) {
        // Get total players count
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id')
          .eq('game_room_id', gameRoom.id);

        if (!playersError && players) {
          const totalPlayers = players.length;

          // Check each round and calculate scores if needed
          for (const round of gameRounds) {
            // Count player actions for this round
            const { data: playerActions, error: actionsError } = await supabase
              .from('player_actions')
              .select('id')
              .eq('game_round_id', round.id);

            if (!actionsError && playerActions && playerActions.length === totalPlayers) {
              // This round is complete, check if results exist
              const { data: existingResults, error: resultsError } = await supabase
                .from('round_results')
                .select('id')
                .eq('game_round_id', round.id);

              if (!resultsError && (!existingResults || existingResults.length === 0)) {
                // Need to calculate results for this round
                console.log(`Calculating results for round ${round.round_number} before finishing game`);
                
                // Call results calculation logic here if needed
                // For now, we'll just log that this round needs processing
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing completed rounds:', error);
      // Continue with finish process even if this fails
    }

    // Update game room to finished status
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        current_phase: 'results'
      })
      .eq('id', gameRoom.id);

    if (updateError) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to finish game'
      }, { status: 500 });
    }

    // Send WebSocket notification to all players in the room
    try {
      await sendGameFinishedNotification(roomCode);
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the API request if WebSocket fails
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      data: { message: 'Game finished successfully' },
      message: 'Game has been finished'
    });

  } catch (error) {
    console.error('Finish game error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 