import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

interface RouteParams {
  params: { roomCode: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;

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

    // Get current round info
    const { data: currentRound } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_room_id', room.id)
      .eq('round_number', room.current_round)
      .single();

    // Fetch detailed player information
    const playersWithDetails = await Promise.all((players || []).map(async (player) => {
      // Get player's actions for current round
      const { data: actions } = await supabase
        .from('player_actions')
        .select('*')
        .eq('player_id', player.id)
        .eq('game_round_id', currentRound?.id || '');

      // Get player's cards
      const { data: cards } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', player.id);

      // Get airplanes for reference
      const { data: airplanes } = await supabase
        .from('airplanes')
        .select('*')
        .eq('game_round_id', currentRound?.id || '');

      // Find selected airplane
      const airplaneAction = actions?.find(action => action.airplane_id);
      const selectedAirplane = airplaneAction ? 
        airplanes?.find(airplane => airplane.id === airplaneAction.airplane_id) : null;

      // Find selected card
      const cardAction = actions?.find(action => action.selected_card_id);
      const selectedCard = cardAction ? 
        cards?.find(card => card.id === cardAction.selected_card_id) : null;

      return {
        ...player,
        actions: actions || [],
        cards: cards || [],
        selectedAirplane: selectedAirplane ? {
          id: selectedAirplane.id,
          airplane_number: selectedAirplane.airplane_number
        } : null,
        selectedCard: selectedCard ? {
          id: selectedCard.id,
          card_type: selectedCard.card_type,
          is_used: selectedCard.is_used
        } : null,
        actionCount: actions?.length || 0,
        cardCount: cards?.length || 0
      };
    }));

    // Get game statistics
    const gameStats = {
      totalPlayers: players?.length || 0,
      readyPlayers: players?.filter(p => p.is_ready).length || 0,
      playersWithActions: playersWithDetails.filter(p => p.actionCount > 0).length,
      playersWithAirplane: playersWithDetails.filter(p => p.selectedAirplane).length,
      playersWithCard: playersWithDetails.filter(p => p.selectedCard).length
    };

    return NextResponse.json({ 
      room, 
      players: playersWithDetails,
      currentRound,
      gameStats
    });
  } catch (error) {
    console.error('Admin room details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomCode } = await params;

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