export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generatePlayerCards, generateAirplaneNumbers } from '@/lib/game/gameLogic';
import { ApiResponse } from '@/types/database';
import mockGameState from '@/lib/game/mockGameState';

// Function to send WebSocket notification for game start
async function sendGameStartNotification(roomCode: string) {
  try {
    // Edge runtime에서는 Node.js WebSocket을 사용할 수 없으므로 
    // HTTP API를 통해 WebSocket 서버에 알림을 보냅니다
    console.log(`[GameStart] Sending game start notification for room ${roomCode} via HTTP`);
    
    // Cloudflare Workers WebSocket 서버에 HTTP 요청으로 알림 전송
    const response = await fetch('https://airplane-hijacking-websocket-v2.affectome22.workers.dev/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'admin_state_change',
        roomCode: roomCode,
        action: 'game_start',
        details: {
          phase: 'airplane_selection',
          round: 1
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`[GameStart] Successfully sent game start notification for room ${roomCode}:`, result);
    } else {
      const errorText = await response.text();
      console.error(`[GameStart] Failed to send notification: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('[GameStart] Error sending HTTP notification:', error);
    // Don't fail the API call
  }
}

export async function POST(request: NextRequest) {
  console.log('[GameStart] API called');
  
  try {
    // Parse request body
    console.log('[GameStart] Parsing request body...');
    const { roomCode, userId } = await request.json();
    console.log(`[GameStart] Parsed body - roomCode: ${roomCode}, userId: ${userId}`);

    if (!roomCode || !userId) {
      console.error('[GameStart] Missing required parameters:', { roomCode, userId });
      return NextResponse.json<ApiResponse<null>>({
        error: 'Room code and userId are required'
      }, { status: 400 });
    }

    try {
      console.log(`[GameStart] Starting Supabase operations for room ${roomCode}`);
      
      // Check game room and host permissions
      console.log('[GameStart] Querying game room...');
      const { data: gameRoom, error: roomError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players!inner(user_id, username)
        `)
        .eq('room_code', roomCode)
        .eq('status', 'waiting')
        .single();

      console.log('[GameStart] Game room query result:', { 
        found: !!gameRoom, 
        error: roomError?.message || 'none',
        status: gameRoom?.status || 'unknown'
      });

      if (roomError || !gameRoom) {
        console.error('[GameStart] Room query failed:', roomError);
        throw new Error('Supabase room not found');
      }

      // Check if user is the host (first player)
      console.log('[GameStart] Querying players...');
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_room_id', gameRoom.id);

      console.log('[GameStart] Players query result:', {
        playerCount: players?.length || 0,
        error: playersError?.message || 'none',
        playerIds: players?.map(p => p.user_id) || []
      });

      if (playersError || !players || players.length === 0) {
        console.error('[GameStart] Players query failed:', playersError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'No players found'
        }, { status: 404 });
      }

      const hostPlayer = players[0];
      console.log('[GameStart] Host check:', {
        hostUserId: hostPlayer.user_id,
        requestUserId: userId,
        isHost: hostPlayer.user_id === userId
      });

      if (hostPlayer.user_id !== userId) {
        console.error('[GameStart] Host permission denied');
        return NextResponse.json<ApiResponse<null>>({
          error: 'Only the host can start the game'
        }, { status: 403 });
      }

      // Check minimum player count (at least 2)
      if (players.length < 2) {
        console.error(`[GameStart] Insufficient players: ${players.length}`);
        return NextResponse.json<ApiResponse<null>>({
          error: 'At least 2 players required to start the game'
        }, { status: 400 });
      }

      // Check if all players are ready
      const readyCount = players.filter(p => p.is_ready).length;
      const allReady = players.every((p: any) => p.is_ready);
      console.log('[GameStart] Readiness check:', {
        totalPlayers: players.length,
        readyPlayers: readyCount,
        allReady
      });

      if (!allReady) {
        console.error('[GameStart] Not all players ready');
        return NextResponse.json<ApiResponse<null>>({
          error: 'All players must be ready to start the game'
        }, { status: 400 });
      }

      // Clear existing cards for all players in this game
      console.log('[GameStart] Clearing existing cards...');
      const { error: clearCardsError } = await supabase
        .from('player_cards')
        .delete()
        .in('player_id', players.map(p => p.id));

      if (clearCardsError) {
        console.error('[GameStart] Cards clearing error:', clearCardsError);
        // Continue anyway - this might be the first time starting
      } else {
        console.log('[GameStart] Cards cleared successfully');
      }

      // Clear existing rounds and airplanes for this game room
      console.log('[GameStart] Clearing existing rounds and airplanes...');
      
      // First get all existing rounds for this game room
      const { data: existingRounds } = await supabase
        .from('game_rounds')
        .select('id')
        .eq('game_room_id', gameRoom.id);

      if (existingRounds && existingRounds.length > 0) {
        console.log(`[GameStart] Found ${existingRounds.length} existing rounds to clear`);
        
        // Clear all airplanes for this game room in one go (safer approach)
        const { error: clearAirplanesError } = await supabase
          .from('airplanes')
          .delete()
          .in('game_round_id', existingRounds.map(r => r.id));

        if (clearAirplanesError) {
          console.error('[GameStart] Airplanes clearing error:', clearAirplanesError);
          // Try alternative approach: delete through rounds CASCADE
          console.log('[GameStart] Trying CASCADE delete via rounds...');
        } else {
          console.log('[GameStart] Airplanes cleared successfully');
        }

        // Clear all rounds for this game room (will cascade delete remaining airplanes)
        const { error: clearRoundsError } = await supabase
          .from('game_rounds')
          .delete()
          .eq('game_room_id', gameRoom.id);

        if (clearRoundsError) {
          console.error('[GameStart] Rounds clearing error:', clearRoundsError);
        } else {
          console.log('[GameStart] Rounds cleared successfully');
        }

        // Additional safety: directly clear any remaining airplanes for this game room
        const { error: finalAirplaneCleanup } = await supabase
          .from('airplanes')
          .delete()
          .in('game_round_id', existingRounds.map(r => r.id));

        if (finalAirplaneCleanup && finalAirplaneCleanup.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('[GameStart] Final airplane cleanup error:', finalAirplaneCleanup);
        } else {
          console.log('[GameStart] Final airplane cleanup completed');
        }
      } else {
        console.log('[GameStart] No existing rounds to clear');
      }

      // Distribute fresh cards to each player
      console.log('[GameStart] Generating and inserting cards...');
      const cardInserts = [];
      for (let i = 0; i < players.length; i++) {
        const playerCardSet = generatePlayerCards(); // Generate new card set for each player
        console.log(`[GameStart] Generated cards for player ${players[i].username}:`, playerCardSet);
        for (const cardType of playerCardSet) {
          cardInserts.push({
            player_id: players[i].id,
            card_type: cardType,
            is_used: false
          });
        }
      }

      console.log(`[GameStart] Inserting ${cardInserts.length} cards...`);
      const { error: cardsError } = await supabase
        .from('player_cards')
        .insert(cardInserts);

      if (cardsError) {
        console.error('[GameStart] Cards creation error:', cardsError);
        console.error('[GameStart] Failed card inserts sample:', cardInserts.slice(0, 3));
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to distribute cards'
        }, { status: 500 });
      }
      console.log('[GameStart] Cards inserted successfully');

      // Create first round
      console.log('[GameStart] Creating first round...');
      const { data: round, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
          game_room_id: gameRoom.id,
          round_number: 1,
          phase: 'airplane_selection'
        })
        .select()
        .single();

      if (roundError) {
        console.error('[GameStart] Round creation error:', roundError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to create first round'
        }, { status: 500 });
      }
      console.log('[GameStart] Round created:', round.id);

      // Create airplanes for the first round
      console.log('[GameStart] Generating airplanes...');
      const airplaneNumbers = generateAirplaneNumbers();
      console.log('[GameStart] Generated airplane numbers:', airplaneNumbers);
      
      const airplaneInserts = airplaneNumbers.map(num => {
        let max_passengers: number;
        switch (num) {
          case 1:
          case 2:
            max_passengers = 2;
            break;
          case 3:
            max_passengers = 4;
            break;
          case 4:
            max_passengers = 8;
            break;
          default:
            max_passengers = 2;
        }
        return {
          game_round_id: round.id,
          airplane_number: num,
          max_passengers: max_passengers
        };
      });

      console.log('[GameStart] Airplane inserts:', airplaneInserts);
      
      // Use UPSERT to handle potential duplicates safely
      const { error: airplanesError } = await supabase
        .from('airplanes')
        .upsert(airplaneInserts, {
          onConflict: 'game_round_id,airplane_number',
          ignoreDuplicates: false
        });

      if (airplanesError) {
        console.error('[GameStart] Airplanes creation error:', airplanesError);
        
        // Try alternative approach: insert one by one with error handling
        console.log('[GameStart] Trying individual airplane inserts...');
        let insertedCount = 0;
        for (const airplane of airplaneInserts) {
          const { error: singleError } = await supabase
            .from('airplanes')
            .upsert(airplane, {
              onConflict: 'game_round_id,airplane_number',
              ignoreDuplicates: false
            });
          
          if (!singleError) {
            insertedCount++;
          } else {
            console.error(`[GameStart] Failed to insert airplane ${airplane.airplane_number}:`, singleError);
          }
        }
        
        if (insertedCount === 0) {
          return NextResponse.json<ApiResponse<null>>({
            error: 'Failed to create airplanes'
          }, { status: 500 });
        } else {
          console.log(`[GameStart] Successfully inserted ${insertedCount}/${airplaneInserts.length} airplanes`);
        }
      } else {
        console.log('[GameStart] Airplanes created successfully');
      }

      // Update game room status
      console.log('[GameStart] Updating game room status...');
      const { data: updatedRoom, error: updateError } = await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          current_round: 1,
          current_phase: 'airplane_selection',
          phase_start_time: new Date().toISOString()
        })
        .eq('id', gameRoom.id)
        .select()
        .single();

      if (updateError) {
        console.error('[GameStart] Room update error:', updateError);
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to start game'
        }, { status: 500 });
      }
      console.log('[GameStart] Game room updated successfully');

      // Send WebSocket notification to all players in the room
      try {
        console.log(`[GameStart] Attempting to send WebSocket notification for room ${roomCode}`);
        await sendGameStartNotification(roomCode);
        console.log(`[GameStart] WebSocket notification sent for room ${roomCode}`);
      } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
        // Don't fail the API request if WebSocket fails
      }

      console.log('[GameStart] Supabase flow completed successfully');
      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom: updatedRoom,
          round: round,
          players: players.length,
          message: 'Game started successfully'
        }
      });

    } catch (supabaseError) {
      console.error('[GameStart] Supabase operation failed, using memory-based game state:', supabaseError);
      console.error('[GameStart] Supabase error details:', {
        message: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
        stack: supabaseError instanceof Error ? supabaseError.stack : 'No stack trace'
      });
      
      // Use memory-based game state
      console.log('[GameStart] Switching to memory mode...');
      const memoryGameRoom = mockGameState.getGameRoom(roomCode);
      if (!memoryGameRoom) {
        console.error('[GameStart] Memory game room not found');
        return NextResponse.json<ApiResponse<null>>({
          error: 'Game room not found'
        }, { status: 404 });
      }

      const players = mockGameState.getPlayers(memoryGameRoom.id);
      const hostPlayer = mockGameState.getHostPlayer(memoryGameRoom.id);

      console.log('[GameStart Memory] Player check:', {
        playerCount: players.length,
        hostFound: !!hostPlayer,
        hostUserId: hostPlayer?.user_id,
        requestUserId: userId
      });

      if (!hostPlayer || hostPlayer.user_id !== userId) {
        console.error('[GameStart Memory] Host permission denied');
        return NextResponse.json<ApiResponse<null>>({
          error: 'Only the host can start the game'
        }, { status: 403 });
      }

      if (players.length < 2) {
        console.error(`[GameStart Memory] Insufficient players: ${players.length}`);
        return NextResponse.json<ApiResponse<null>>({
          error: 'At least 2 players required to start the game'
        }, { status: 400 });
      }

      if (!mockGameState.getAllPlayersReady(memoryGameRoom.id)) {
        console.error('[GameStart Memory] Not all players ready');
        return NextResponse.json<ApiResponse<null>>({
          error: 'All players must be ready to start the game'
        }, { status: 400 });
      }

      // Clear existing cards for all players
      console.log('[GameStart Memory] Clearing cards...');
      for (const player of players) {
        mockGameState.clearPlayerCards(player.id);
      }

      // Clear existing rounds and airplanes for this game room
      console.log('[GameStart Memory] Clearing existing rounds and airplanes (memory mode - simplified)...');

      // Distribute fresh cards to each player
      console.log('[GameStart Memory] Distributing cards...');
      for (const player of players) {
        const playerCardSet = generatePlayerCards();
        mockGameState.addPlayerCards(player.id, playerCardSet);
      }

      // Create first round
      console.log('[GameStart Memory] Creating round...');
      const round = mockGameState.createRound(memoryGameRoom.id, 1);

      // Create airplanes
      console.log('[GameStart Memory] Creating airplanes...');
      const airplaneNumbers = generateAirplaneNumbers();
      mockGameState.createAirplanes(round.id, airplaneNumbers);

      // Update game room status
      console.log('[GameStart Memory] Updating room status...');
      const updatedRoom = mockGameState.updateGameRoom(roomCode, {
        status: 'playing',
        current_round: 1,
        current_phase: 'airplane_selection',
        phase_start_time: new Date().toISOString()
      });

      // Send WebSocket notification to all players in the room
      try {
        console.log(`[GameStart Memory] Attempting to send WebSocket notification for room ${roomCode}`);
        await sendGameStartNotification(roomCode);
        console.log(`[GameStart Memory] WebSocket notification sent for room ${roomCode}`);
      } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
        // Don't fail the API request if WebSocket fails
      }

      console.log('[GameStart Memory] Memory flow completed successfully');
      return NextResponse.json<ApiResponse<any>>({
        data: {
          gameRoom: updatedRoom,
          round: round,
          players: players.length,
          message: 'Game started successfully (memory mode - real multiplayer)'
        }
      });
    }

  } catch (error) {
    console.error('[GameStart] Top-level error:', error);
    console.error('[GameStart] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      errorObject: error
    });
    
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
