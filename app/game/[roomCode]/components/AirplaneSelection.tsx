'use client';

import { useState, useEffect } from 'react';

interface Airplane {
  id: string;
  airplane_number: number;
  max_passengers: number;
}

interface Player {
  id: string;
  user_id: string;
  username: string;
}

interface PlayerAction {
  id: string;
  player_id: string;
  action_type?: string;
  actionType?: string;
  airplane_id?: string;
  selected_card_id?: string; // Added for clarity
}

interface AirplaneSelectionProps {
  airplanes: Airplane[];
  players: Player[];
  allPlayerActions: PlayerAction[];
  onSelectAirplane: (airplaneId: string) => void;
  selectedAirplane?: string;
  currentUserId: string;
  phaseStartTime?: string;  // Add this line
  roomCode: string;  // Add this line
}

export default function AirplaneSelection({ 
  airplanes, 
  players,
  allPlayerActions,
  onSelectAirplane, 
  selectedAirplane,
  currentUserId,
  phaseStartTime,
  roomCode
}: AirplaneSelectionProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Timer logic
  useEffect(() => {
    if (!phaseStartTime) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(phaseStartTime).getTime();
    const duration = 40 * 1000; // 15 seconds
    const endTime = startTime + duration;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);

      // Only auto-progress when timer expires
      if (remaining === 0) {
        handleNextPhase();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phaseStartTime]);

  // Function to handle phase transition
  const handleNextPhase = async () => {
    try {
      const port = window.location.port;
      const baseUrl = port ? `http://localhost:${port}` : window.location.origin;
      
      const response = await fetch(`${baseUrl}/api/admin/rooms/${roomCode}/phase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phase: 'discussion'
        }),
      });

      if (!response.ok) {
        console.error('Failed to progress to next phase:', response.status);
      }
    } catch (error) {
      console.error('Error progressing to next phase:', error);
    }
  };

  // Format time for display
  const formatTime = (milliseconds: number | null) => {
    if (milliseconds === null) return '';
    const seconds = Math.ceil(milliseconds / 1000);
    return `${seconds}초`;
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-500';
    if (timeRemaining > 10000) return 'text-green-500';
    if (timeRemaining > 5000) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // // Debug logging
  // console.log('[AirplaneSelection] Received data:', {
  //   airplanes: airplanes?.length,
  //   players: players?.length,
  //   allPlayerActions: allPlayerActions?.length,
  //   selectedAirplane,
  //   currentUserId,
  //   actions: allPlayerActions,
  //   detailedActions: allPlayerActions?.map(action => ({
  //     id: action.id,
  //     player_id: action.player_id,
  //     action_type: action.action_type || action.actionType,
  //     airplane_id: action.airplane_id
  //   })),
  //   playersData: players?.map(p => ({
  //     id: p.id,
  //     user_id: p.user_id,
  //     username: p.username
  //   }))
  // });
  
  const getAirplaneEmoji = (number: number) => {
    const emojis = ['✈️', '🛩️', '🛫', '🛬'];
    return emojis[number - 1] || '✈️';
  };

  const handleSelectAirplane = (airplaneId: string) => {
    const airplane = airplanes.find(a => a.id === airplaneId);
    const playersOnThisAirplane = getPlayersOnAirplane(airplaneId);
    if (airplane && playersOnThisAirplane.length >= airplane.max_passengers) {
      alert('이 비행기는 인원 제한이 초과되었습니다.');
      return;
    }
    onSelectAirplane(airplaneId);
  };

  // Get players who selected each airplane
  const getPlayersOnAirplane = (airplaneId: string) => {
    // Prioritize action_type field, fallback to airplane_id presence for backward compatibility
    const airplaneActions = allPlayerActions.filter(action => {
      const actionType = action.action_type || action.actionType;
      return (actionType === 'select_airplane' || (action.airplane_id && !action.selected_card_id && !actionType)) && action.airplane_id === airplaneId;
    });
    
    return airplaneActions.map(action => {
      const player = players.find(p => p.id === action.player_id);
      return player ? player.username : 'Unknown';
    });
  };

  // Get players who haven't selected yet
  const getPlayersNotSelected = () => {
    const playersWithActions = allPlayerActions
      .filter(action => {
        const actionType = action.action_type || action.actionType;
        return actionType === 'select_airplane' || (action.airplane_id && !action.selected_card_id && !actionType);
      })
      .map(action => action.player_id);
    
    return players.filter(player => !playersWithActions.includes(player.id));
  };

  const playersNotSelected = getPlayersNotSelected();

  // console.log('[AirplaneSelection] Received data:', {
  //   airplanes: airplanes.length,
  //   players: players.length,
  //   allPlayerActions: allPlayerActions.length,
  //   selectedAirplane,
  //   currentUserId,
  //   playersNotSelected: playersNotSelected.length
  // });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">✈️ 비행기 선택</h2>
        <p className="text-gray-600">탑승할 비행기를 선택하세요</p>
      </div>

      {/* 타이머 */}
      {timeRemaining !== null && (
        <div className="text-center mb-8">
          <div className={`text-4xl font-bold ${getTimerColor()} mb-2`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                timeRemaining > 10000 ? 'bg-green-500' : 
                timeRemaining > 5000 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(timeRemaining / 15000) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            남은 시간: {formatTime(timeRemaining)}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        {airplanes.map((airplane) => {
          const playersOnThisAirplane = getPlayersOnAirplane(airplane.id);
          const isSelected = selectedAirplane === airplane.id;
          
          return (
            <div
              key={airplane.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleSelectAirplane(airplane.id)}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {getAirplaneEmoji(airplane.airplane_number)} 비행기 {airplane.airplane_number}
                </h3>
                
                {isSelected && (
                  <div className="text-green-600 font-medium mb-2">
                    ✓ 선택됨
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  <div className="mb-1">
                    <span className={`font-medium ${
                      playersOnThisAirplane.length >= airplane.max_passengers 
                        ? 'text-red-600' 
                        : playersOnThisAirplane.length === airplane.max_passengers - 1
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {playersOnThisAirplane.length}/{airplane.max_passengers}
                    </span> 명 탑승
                    {playersOnThisAirplane.length >= airplane.max_passengers && (
                      <div className="text-red-600 text-xs mt-1">
                        탑승 불가 (정원 초과)
                      </div>
                    )}
                  </div>
                  {playersOnThisAirplane.length > 0 && (
                    <div className="text-xs">
                      {playersOnThisAirplane.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {playersNotSelected.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">아직 선택하지 않은 플레이어:</h3>
          <div className="text-sm text-yellow-700">
            {playersNotSelected.map(player => player.username).join(', ')}
          </div>
        </div>
      )}

      {/* 다음 단계 안내 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-800 font-medium">
          비행기 선택이 끝나면 자동으로 토론 단계로 넘어갑니다.
        </p>
      </div>
    </div>
  );
}; 