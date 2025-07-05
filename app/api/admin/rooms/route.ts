import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface GameRoom {
  id: string;
  room_code: string;
  status: string;
  current_round: number;
  current_phase: string;
  max_players: number;
  created_at: string;
  updated_at: string;
  players?: { count: number }[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer;

    // Fetch all game rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('game_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    // Fetch player counts for each room
    const roomsWithPlayerCounts = await Promise.all(
      (rooms || []).map(async (room: GameRoom) => {
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id')
          .eq('game_room_id', room.id);

        if (playersError) {
          console.error('Error fetching players for room:', room.room_code, playersError);
        }

        return {
          id: room.id,
          room_code: room.room_code,
          status: room.status,
          current_round: room.current_round,
          current_phase: room.current_phase,
          max_players: room.max_players,
          player_count: players?.length || 0,
          created_at: room.created_at,
          updated_at: room.updated_at
        };
      })
    );

    return NextResponse.json({ rooms: roomsWithPlayerCounts });
  } catch (error) {
    console.error('Admin rooms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 