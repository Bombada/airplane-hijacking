import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';
import WebSocket from 'ws';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;

    // Get game room
    const { data: gameRoom, error: roomError } = await supabaseServer
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
    const { data: newRound, error: newRoundError } = await supabaseServer
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

    // Create new airplanes
    const airplaneInserts = [1, 2, 3, 4].map(num => ({
      game_round_id: newRound.id,
      airplane_number: num
    }));

    const { error: airplanesError } = await supabaseServer
      .from('airplanes')
      .insert(airplaneInserts);

    if (airplanesError) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to create airplanes'
      }, { status: 500 });
    }

    // Update game room
    const { error: updateError } = await supabaseServer
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

    // Notify players via WebSocket
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8080');
      
      const timeout = setTimeout(() => {
        console.log('[Admin] WebSocket notification timeout');
        ws.close();
      }, 5000);
      
      ws.on('open', () => {
        console.log(`[Admin] Sending next round notification for room ${roomCode}: Round ${nextRound}`);
        
        // Join the room as admin
        ws.send(JSON.stringify({
          type: 'join_room',
          roomCode: roomCode,
          userId: 'admin'
        }));
        
        // Send admin state change notification after a short delay
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'admin_state_change',
            roomCode: roomCode,
            action: 'next_round',
            details: {
              newRound: nextRound,
              phase: 'airplane_selection'
            }
          }));
          
          // Close connection
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
          }, 200);
        }, 200);
      });
      
      ws.on('error', (error: any) => {
        console.error('WebSocket error in next round notification:', error);
        clearTimeout(timeout);
      });
      
      ws.on('close', () => {
        clearTimeout(timeout);
      });
    } catch (wsError) {
      console.error('WebSocket notification failed:', wsError);
      // Continue anyway - the API call succeeded
    }

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