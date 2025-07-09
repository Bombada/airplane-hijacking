export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { phase } = await request.json();

    console.log(`[Admin] Changing phase for room ${roomCode} to ${phase}`);

    if (!phase) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Phase is required' },
        { status: 400 }
      );
    }

    // Validate phase
    const validPhases = ['waiting', 'airplane_selection', 'discussion', 'card_selection', 'results'];
    if (!validPhases.includes(phase)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: `Invalid phase: ${phase}. Valid phases are: ${validPhases.join(', ')}` },
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
      console.error('Room not found:', roomError);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    console.log(`[Admin] Current room phase: ${gameRoom.current_phase}, changing to: ${phase}`);

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
        { error: `Failed to update phase: ${updateError.message}` },
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

    console.log(`[Admin] Successfully changed phase for room ${roomCode} to ${phase}`);

    // Note: Real-time updates will be handled by the client-side WebSocket connections
    // The clients will detect the phase change through polling or WebSocket messages

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: {
        roomCode,
        phase,
        message: `Phase changed to ${phase} successfully. Clients will be notified through WebSocket connections.`
      }
    });

  } catch (error) {
    console.error('Error changing phase:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 