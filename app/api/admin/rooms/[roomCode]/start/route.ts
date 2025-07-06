import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface RouteParams {
  params: { roomCode: string };
}

// Function to send WebSocket notification directly
async function sendAdminStateChangeNotification(roomCode: string, action: string, details?: any) {
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

    // Send WebSocket notification to all players in the room
    try {
      await sendAdminStateChangeNotification(roomCode, 'game_started', { 
        status: 'playing',
        phase: 'airplane_selection'
      });
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the API request if WebSocket fails
    }

    return NextResponse.json({ success: true, message: 'Game started successfully' });
  } catch (error) {
    console.error('Admin start game API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 