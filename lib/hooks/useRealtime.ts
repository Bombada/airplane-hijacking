import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

interface RealtimeData {
  gameRooms: any[];
  players: any[];
  isConnected: boolean;
  lastUpdate: Date | null;
}

export const useRealtime = (roomCode: string) => {
  const [data, setData] = useState<RealtimeData>({
    gameRooms: [],
    players: [],
    isConnected: false,
    lastUpdate: null,
  });

  const handleGameRoomChange = (payload: any) => {
    console.log('Game room change:', payload);
    setData(prev => ({
      ...prev,
      gameRooms: [...prev.gameRooms, payload],
      lastUpdate: new Date(),
    }));
  };

  const handlePlayerChange = (payload: any) => {
    console.log('Player change:', payload);
    setData(prev => ({
      ...prev,
      players: [...prev.players, payload],
      lastUpdate: new Date(),
    }));
  };

  useEffect(() => {
    const channel = supabase
      .channel(`game_room_${roomCode}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms' },
        handleGameRoomChange
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        handlePlayerChange
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setData(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
        }));
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return data;
}; 