export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { validateRoomCode } from '@/lib/utils/roomCode';
import { ApiResponse, GameRoom, Player } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, username, userId } = await request.json();

    if (!roomCode || !username || !userId) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Room code, username, and userId are required'
      }, { status: 400 });
    }

    if (!validateRoomCode(roomCode)) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Invalid room code format'
      }, { status: 400 });
    }

    try {
      // Try Supabase first
      const { data: gameRoom, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !gameRoom) {
        throw new Error('Supabase room not found');
      }

      // Check current player count
      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('game_room_id', gameRoom.id);

      if (playersError) {
        throw new Error('Players check error');
      }

      if (existingPlayers.length >= 8) { // Max 8 players
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room is full'
        }, { status: 400 });
      }

      // Check if user already joined
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('game_room_id', gameRoom.id)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'User already joined this game'
        }, { status: 400 });
      }

      // Add player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_room_id: gameRoom.id,
          user_id: userId,
          username: username,
          total_score: 0,
          is_ready: false
        })
        .select()
        .single();

      if (playerError) {
        throw new Error('Player creation error');
      }

      return NextResponse.json<ApiResponse<GameRoom>>({
        data: gameRoom,
        message: 'Joined game successfully'
      });

    } catch (supabaseError) {
      console.error('Supabase failed, using memory-based game state:', supabaseError);

      // Try memory-based game state
      const memoryGameRoom = mockGameState.getGameRoom(roomCode.toUpperCase());
      if (!memoryGameRoom || memoryGameRoom.status !== 'waiting') {
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room not found or not available for joining'
        }, { status: 404 });
      }

      // Check player count and existing player in memory
      const playerCount = mockGameState.getPlayerCount(memoryGameRoom.id);
      if (playerCount >= 8) { // Max 8 players
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room is full'
        }, { status: 400 });
      }

      const existingPlayer = mockGameState.getPlayer(userId, memoryGameRoom.id);
      if (existingPlayer) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'User already joined this game'
        }, { status: 400 });
      }

      // Add player to memory
      mockGameState.addPlayer(memoryGameRoom.id, userId, username);

      return NextResponse.json<ApiResponse<GameRoom>>({
        data: memoryGameRoom as GameRoom,
        message: 'Joined game successfully (memory mode)'
      });
    }

  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
