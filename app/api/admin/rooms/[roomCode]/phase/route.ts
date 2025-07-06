import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

// Function to send WebSocket notification directly
async function sendPhaseChangeNotification(roomCode: string, phase: string) {
  return new Promise<void>((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8080');
      
      const timeout = setTimeout(() => {
        console.log('[Admin] WebSocket notification timeout');
        ws.close();
        resolve();
      }, 5000);
      
      ws.on('open', () => {
        console.log(`[Admin] Sending phase change notification for room ${roomCode} to phase ${phase}`);
        
        // Join the room as admin
        ws.send(JSON.stringify({
          type: 'join_room',
          roomCode: roomCode,
          userId: 'admin'
        }));
        
        // Send phase change notification after a short delay
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'phase_change',
            phase: phase,
            roomCode: roomCode
          }));
          
          // Close connection and resolve
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }, 200);
        }, 200);
      });
      
      ws.on('error', (error: any) => {
        console.error('WebSocket error in phase notification:', error);
        clearTimeout(timeout);
        resolve(); // Don't fail the API call
      });
      
      ws.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      resolve(); // Don't fail the API call
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { phase } = await request.json();

    if (!phase) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Phase is required' },
        { status: 400 }
      );
    }

    // Validate phase
    const validPhases = ['airplane_selection', 'discussion', 'card_selection', 'results'];
    if (!validPhases.includes(phase)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid phase' },
        { status: 400 }
      );
    }

    // Get the game room
    const { data: gameRoom, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !gameRoom) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Update the game room phase
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ 
        current_phase: phase,
        phase_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('room_code', roomCode);

    if (updateError) {
      console.error('Error updating room phase:', updateError);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to update phase' },
        { status: 500 }
      );
    }

    // Also update the current round phase if it exists
    const { error: roundUpdateError } = await supabase
      .from('game_rounds')
      .update({ phase })
      .eq('game_room_id', gameRoom.id)
      .eq('round_number', gameRoom.current_round);

    if (roundUpdateError) {
      console.error('Error updating round phase:', roundUpdateError);
      // Don't fail the request if round update fails
    }

    // Send WebSocket notification to all players in the room
    try {
      await sendPhaseChangeNotification(roomCode, phase);
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the API request if WebSocket fails
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true
    });

  } catch (error) {
    console.error('Error changing phase:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 