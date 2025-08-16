export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';
import WebSocket from 'ws';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = await params;

    // Get game room
    const { data: gameRoom, error: roomError } =  await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !gameRoom) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Game room not found'
      }, { status: 404 });
    }

    // Check if current phase is results
    if (gameRoom.current_phase !== 'results') {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Can only start next round from results phase'
      }, { status: 400 });
    }

    // Check if game is already finished
    if (gameRoom.current_round >= 5) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Game is already finished (5 rounds completed)'
      }, { status: 400 });
    }

    // Proceed to next round
    const nextRound = gameRoom.current_round + 1;
    
    // Create new round
    const { data: newRound, error: newRoundError } = await supabase
      .from('game_rounds')
      .insert({
        game_room_id: gameRoom.id,
        round_number: nextRound,
        phase: 'airplane_selection'
      })
      .select()
      .single();

    if (newRoundError || !newRound) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to create new round'
      }, { status: 500 });
    }

    // Create airplanes for the new round
    const airplaneInserts = [
      { game_round_id: newRound.id, airplane_number: 1, max_passengers: 2 },
      { game_round_id: newRound.id, airplane_number: 2, max_passengers: 2 },
      { game_round_id: newRound.id, airplane_number: 3, max_passengers: 4 },
      { game_round_id: newRound.id, airplane_number: 4, max_passengers: 8 }
    ];

    // Use UPSERT to handle potential duplicates safely
    const { error: airplanesError } = await supabase
      .from('airplanes')
      .upsert(airplaneInserts, {
        onConflict: 'game_round_id,airplane_number',
        ignoreDuplicates: false
      });

    if (airplanesError) {
      console.error('Failed to create airplanes for new round:', airplanesError);
      
      // Try alternative approach: insert one by one with error handling
      console.log('[NextRound] Trying individual airplane inserts...');
      let insertedCount = 0;
      for (const airplane of airplaneInserts) {
        const { error: singleError } = await supabase
          .from('airplanes')
          .upsert(airplane, {
            onConflict: 'game_round_id,airplane_number',
            ignoreDuplicates: false
          });
        
        if (!singleError) {
          insertedCount++;
        } else {
          console.error(`[NextRound] Failed to insert airplane ${airplane.airplane_number}:`, singleError);
        }
      }
      
      if (insertedCount === 0) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to create airplanes for new round'
        }, { status: 500 });
      } else {
        console.log(`[NextRound] Successfully inserted ${insertedCount}/${airplaneInserts.length} airplanes`);
      }
    } else {
      console.log('[NextRound] Airplanes created successfully');
    }

    // Update game room
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        current_round: nextRound,
        current_phase: 'airplane_selection',
        phase_start_time: new Date().toISOString()
      })
      .eq('id', gameRoom.id);

    if (updateError) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to update game room'
      }, { status: 500 });
    }

    // Notify players via HTTP
    try {
      console.log(`[Admin] Sending next round notification for room ${roomCode}: Round ${nextRound} via HTTP`);
      
      // Send notification to Cloudflare Workers WebSocket server via HTTP
      await fetch('https://airplane-hijacking-websocket-v2.affectome22.workers.dev/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin_state_change',
          roomCode: roomCode,
          action: 'next_round',
          details: {
            newRound: nextRound,
            phase: 'airplane_selection'
          }
        })
      });
      
      console.log(`[Admin] Successfully sent next round notification for room ${roomCode}`);
    } catch (wsError) {
      console.error('HTTP notification failed:', wsError);
      // Continue anyway - the API call succeeded
    }

    // Return success response even if WebSocket notification fails
    return NextResponse.json<ApiResponse<{ message: string }>>({
      data: { message: `Round ${nextRound} started successfully` },
      message: `Round ${nextRound} started`
    });

  } catch (error) {
    console.error('Next round error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 