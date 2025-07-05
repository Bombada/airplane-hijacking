import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface RouteParams {
  params: { roomCode: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;
    const supabase = supabaseServer;

    // Fetch room details
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch players in the room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_room_id', room.id);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    return NextResponse.json({ room, players: players || [] });
  } catch (error) {
    console.error('Admin room details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;
    const supabase = supabaseServer;

    // Get room ID first
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Delete related data first (due to foreign key constraints)
    await supabase.from('player_actions').delete().eq('game_room_id', room.id);
    await supabase.from('game_rounds').delete().eq('game_room_id', room.id);
    await supabase.from('players').delete().eq('game_room_id', room.id);
    
    // Delete the room
    const { error: deleteError } = await supabase
      .from('game_rooms')
      .delete()
      .eq('id', room.id);

    if (deleteError) {
      console.error('Error deleting room:', deleteError);
      return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin room delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 