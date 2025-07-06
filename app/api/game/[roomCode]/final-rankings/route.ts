import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/database';

interface PlayerRanking {
  id: string;
  username: string;
  total_score: number;
  rank: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;

    try {
      // Check game room
      const { data: gameRoom, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError || !gameRoom) {
        // Mock mode - return mock rankings
        return NextResponse.json<ApiResponse<PlayerRanking[]>>({
          data: [
            {
              id: 'mock-1',
              username: 'Mock Player 1',
              total_score: 25,
              rank: 1
            },
            {
              id: 'mock-2',
              username: 'Mock Player 2',
              total_score: 20,
              rank: 2
            }
          ],
          message: 'Final rankings retrieved (mock mode)'
        });
      }

      // Get all players with their total scores
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, username, total_score')
        .eq('game_room_id', gameRoom.id)
        .order('total_score', { ascending: false });

      if (playersError) {
        console.error('Players error:', playersError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to get players: ' + playersError.message
        }, { status: 500 });
      }

      if (!players || players.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'No players found'
        }, { status: 404 });
      }

      // Add rank to each player
      const rankings: PlayerRanking[] = players.map((player, index) => ({
        id: player.id,
        username: player.username,
        total_score: player.total_score,
        rank: index + 1
      }));

      return NextResponse.json<ApiResponse<PlayerRanking[]>>({
        data: rankings,
        message: 'Final rankings retrieved successfully'
      });

    } catch (supabaseError) {
      console.error('Supabase operation failed:', supabaseError);
      
      // Mock mode - return mock rankings
      return NextResponse.json<ApiResponse<PlayerRanking[]>>({
        data: [
          {
            id: 'mock-1',
            username: 'Mock Player 1',
            total_score: 25,
            rank: 1
          },
          {
            id: 'mock-2',
            username: 'Mock Player 2',
            total_score: 20,
            rank: 2
          }
        ],
        message: 'Final rankings retrieved (mock mode - Supabase unavailable)'
      });
    }

  } catch (error) {
    console.error('Get final rankings error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 