export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

interface RouteParams {
  params: { roomCode: string };
}

// Function to send WebSocket notification directly
async function sendAdminStateChangeNotification(roomCode: string, action: string, details?: any) {
  return new Promise<void>((resolve) => {
    try {
      const WebSocket = require('ws');
      const port = process.env.NEXT_PUBLIC_WS_PORT || '8080';
      const host = process.env.NEXT_PUBLIC_WS_HOST || 'localhost';
      const ws = new WebSocket(`ws://${host}:${port}`);
      
      const timeout = setTimeout(() => {
        console.log('[Admin] WebSocket notification timeout');
        ws.close();
        resolve();
      }, 5000);
      
      ws.on('open', () => {
        console.log(`[Admin] Sending admin state change notification for room ${roomCode}: ${action}`);
        
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
            action: action,
            details: details
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
        console.error('WebSocket error in admin state change notification:', error);
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = params;

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get all players in this room first
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('game_room_id', room.id);

    // Delete all player cards for this room
    if (players && players.length > 0) {
      const playerIds = players.map(p => p.id);
      await supabase.from('player_cards').delete().in('player_id', playerIds);
    }

    // Get all round IDs for this room
    const { data: rounds } = await supabase
      .from('game_rounds')
      .select('id')
      .eq('game_room_id', room.id);

    // Delete all game actions, round results, and rounds for this room
    await supabase.from('player_actions').delete().eq('game_room_id', room.id);
    
    // Delete round results if there are any rounds
    if (rounds && rounds.length > 0) {
      const roundIds = rounds.map(r => r.id);
      await supabase.from('round_results').delete().in('game_round_id', roundIds);
    }
    
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

    // Send WebSocket notification to all players in the room
    try {
      await sendAdminStateChangeNotification(roomCode, 'room_reset', { 
        status: 'waiting',
        phase: 'waiting'
      });
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the API request if WebSocket fails
    }

    return NextResponse.json({ success: true, message: 'Room reset successfully' });
  } catch (error) {
    console.error('Admin reset room API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 