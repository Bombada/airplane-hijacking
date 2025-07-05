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

    // Delete all game actions and rounds for this room
    await supabase.from('player_actions').delete().eq('game_room_id', room.id);
    await supabase.from('game_rounds').delete().eq('game_room_id', room.id);

    // Reset room to initial state
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        status: 'waiting',
        current_round: 1,
        current_phase: 'waiting',
        phase_start_time: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id);

    if (updateError) {
      console.error('Error resetting room:', updateError);
      return NextResponse.json({ error: 'Failed to reset room' }, { status: 500 });
    }

    // Reset all players to not ready
    const { error: playersError } = await supabase
      .from('players')
      .update({
        is_ready: false,
        total_score: 0
      })
      .eq('game_room_id', room.id);

    if (playersError) {
      console.error('Error resetting players:', playersError);
      return NextResponse.json({ error: 'Failed to reset players' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Room reset successfully' });
  } catch (error) {
    console.error('Admin reset room API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 