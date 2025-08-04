export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generatePlayerCards } from '@/lib/game/gameLogic';

interface RouteParams {
  params: { roomCode: string };
}

// Function to send admin state change notification via HTTP
async function sendAdminStateChangeNotification(roomCode: string, action: string, details?: any) {
  return new Promise<void>((resolve) => {
    try {
      console.log(`[Admin] Sending admin state change notification for room ${roomCode}: ${action} via HTTP`);
      
      // Send notification to Cloudflare Workers WebSocket server via HTTP
      fetch('https://airplane-hijacking-websocket-v2.affectome22.workers.dev/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin_state_change',
          roomCode: roomCode,
          action: action,
          details: details
        })
      }).then(response => {
        if (response.ok) {
          console.log(`[Admin] Successfully sent admin state change notification for room ${roomCode}`);
        } else {
          console.error(`[Admin] Failed to send notification: ${response.status}`);
        }
        resolve();
      }).catch(error => {
        console.error('[Admin] Error sending HTTP notification:', error);
        resolve(); // Don't fail the API call
      });
    } catch (error) {
      console.error('[Admin] Error in sendAdminStateChangeNotification:', error);
      resolve(); // Don't fail the API call
    }
  });
}

// Function to send phase change notification via HTTP
async function sendPhaseChangeNotification(roomCode: string, phase: string) {
  return new Promise<void>((resolve) => {
    try {
      console.log(`[Admin] Sending phase change notification for room ${roomCode}: ${phase} via HTTP`);
      
      // Send notification to Cloudflare Workers WebSocket server via HTTP
      fetch('https://airplane-hijacking-websocket-v2.affectome22.workers.dev/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'phase_change',
          phase: phase,
          roomCode: roomCode
        })
      }).then(response => {
        if (response.ok) {
          console.log(`[Admin] Successfully sent phase change notification for room ${roomCode}`);
        } else {
          console.error(`[Admin] Failed to send notification: ${response.status}`);
        }
        resolve();
      }).catch(error => {
        console.error('[Admin] Error sending HTTP notification:', error);
        resolve(); // Don't fail the API call
      });
    } catch (error) {
      console.error('[Admin] Error in sendPhaseChangeNotification:', error);
      resolve(); // Don't fail the API call
    }
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;

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
        phase_start_time: new Date().toISOString(),
        current_round: 1  
      })
      .eq('id', room.id);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }

    // Create first round
    const { data: newRound, error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        game_room_id: room.id,
        round_number: 1,
        phase: 'airplane_selection'
      })
      .select()
      .single();

    if (roundError) {
      console.error('Error creating round:', roundError);
      return NextResponse.json({ error: 'Failed to create game round' }, { status: 500 });
    }

    // Create initial airplanes for the round
    const airplanes = [];
    for (let i = 1; i <= 4; i++) {
      airplanes.push({
        game_round_id: newRound.id,
        airplane_number: i
      });
    }

    const { error: airplanesError } = await supabase
      .from('airplanes')
      .insert(airplanes);

    if (airplanesError) {
      console.error('Error creating airplanes:', airplanesError);
      return NextResponse.json({ error: 'Failed to create airplanes' }, { status: 500 });
    }

    // Create initial cards for each player
    const cardTypes = ['passenger', 'follower', 'hijacker'];  // Update card types to match schema
  
    
    for (const player of players) {
      const playerCards = [];
      const playerCardSet = generatePlayerCards();
      for (let i = 0; i < playerCardSet.length; i++) {
        playerCards.push({
          player_id: player.id,
          card_type: playerCardSet[i],
          is_used: false
        });
      }

      const { error: cardsError } = await supabase
        .from('player_cards')
        .insert(playerCards);

      if (cardsError) {
        console.error('Error creating cards for player:', cardsError);
        return NextResponse.json({ error: 'Failed to create player cards' }, { status: 500 });
      }
    }

    // Send WebSocket notifications to all players in the room
    try {
      // Send game start notification
      await sendAdminStateChangeNotification(roomCode, 'game_start', {
        phase: 'airplane_selection',
        round: 1
      });
      
      // Send phase change notification as well
      await sendPhaseChangeNotification(roomCode, 'airplane_selection');
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