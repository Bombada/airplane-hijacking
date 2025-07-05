import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface RouteParams {
  params: { roomCode: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;
    const supabase = supabaseServer;

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game is not in waiting state' }, { status: 400 });
    }

    // Check if there are at least 2 players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('game_room_id', room.id);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    if (!players || players.length < 2) {
      return NextResponse.json({ error: 'At least 2 players required to start the game' }, { status: 400 });
    }

    // Update room status to playing
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ 
        status: 'playing',
        current_phase: 'airplane_selection',
        phase_start_time: new Date().toISOString()
      })
      .eq('id', room.id);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }

    // Create first round
    const { error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        game_room_id: room.id,
        round_number: 1,
        phase: 'airplane_selection'
      });

    if (roundError) {
      console.error('Error creating round:', roundError);
      return NextResponse.json({ error: 'Failed to create game round' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Game started successfully' });
  } catch (error) {
    console.error('Admin start game API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 