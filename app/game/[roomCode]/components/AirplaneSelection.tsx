'use client';

interface Airplane {
  id: string;
  airplane_number: number;
}

interface Player {
  id: string;
  user_id: string;
  username: string;
}

interface PlayerAction {
  id: string;
  player_id: string;
  action_type: string;
  airplane_id?: string;
}

interface AirplaneSelectionProps {
  airplanes: Airplane[];
  players: Player[];
  allPlayerActions: PlayerAction[];
  onSelectAirplane: (airplaneId: string) => void;
  selectedAirplane?: string;
  currentUserId: string;
}

export default function AirplaneSelection({ 
  airplanes, 
  players,
  allPlayerActions,
  onSelectAirplane, 
  selectedAirplane,
  currentUserId
}: AirplaneSelectionProps) {
  
  const getAirplaneEmoji = (number: number) => {
    const emojis = ['✈️', '🛩️', '🛫', '🛬'];
    return emojis[number - 1] || '✈️';
  };

  // Get players who selected each airplane
  const getPlayersOnAirplane = (airplaneId: string) => {
    const airplaneActions = allPlayerActions.filter(
      action => action.action_type === 'select_airplane' && action.airplane_id === airplaneId
    );
    
    return airplaneActions.map(action => {
      const player = players.find(p => p.id === action.player_id);
      return player ? player.username : 'Unknown';
    });
  };

  // Get players who haven't selected yet
  const getPlayersNotSelected = () => {
    const playersWithActions = allPlayerActions
      .filter(action => action.action_type === 'select_airplane')
      .map(action => action.player_id);
    
    return players.filter(player => !playersWithActions.includes(player.id));
  };

  const playersNotSelected = getPlayersNotSelected();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">비행기 선택</h2>
        <p className="text-gray-600">탑승할 비행기를 선택하세요</p>
      </div>

      {/* 아직 선택하지 않은 플레이어들 표시 */}
      {playersNotSelected.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h3 className="font-semibold text-orange-800 mb-2">
            ⏳ 아직 선택하지 않은 플레이어 ({playersNotSelected.length}명)
          </h3>
          <div className="flex flex-wrap gap-2">
            {playersNotSelected.map(player => (
              <span
                key={player.id}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  player.user_id === currentUserId
                    ? 'bg-orange-200 text-orange-900 border border-orange-300'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {player.username}
                {player.user_id === currentUserId && ' (나)'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {airplanes
          .sort((a, b) => a.airplane_number - b.airplane_number)
          .map((airplane) => {
            const playersOnThisAirplane = getPlayersOnAirplane(airplane.id);
            const isSelected = selectedAirplane === airplane.id;
            
            return (
              <button
                key={airplane.id}
                onClick={() => onSelectAirplane(airplane.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {getAirplaneEmoji(airplane.airplane_number)}
                  </div>
                  <div className="font-semibold text-lg text-gray-800 mb-2">
                    {airplane.airplane_number}번 비행기
                  </div>
                  
                  {/* 탑승한 플레이어들 표시 */}
                  {playersOnThisAirplane.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">
                        탑승자 ({playersOnThisAirplane.length}명)
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {playersOnThisAirplane.map((playerName, index) => (
                          <span
                            key={index}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {playerName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 선택 상태 표시 */}
                  {isSelected && (
                    <div className="mt-2 text-blue-600 font-medium">
                      ✓ 선택됨
                    </div>
                  )}
                  
                  {/* 빈 비행기 표시 */}
                  {playersOnThisAirplane.length === 0 && (
                    <div className="mt-2 text-gray-400 text-sm">
                      승객 없음
                    </div>
                  )}
                </div>
              </button>
            );
          })}
      </div>

      {selectedAirplane && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-green-800 font-medium">
            비행기를 선택했습니다! 다른 플레이어들이 선택할 때까지 기다려주세요.
          </p>
        </div>
      )}

      {!selectedAirplane && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800 font-medium">
            비행기를 선택해주세요. 선택 후에는 변경할 수 있습니다.
          </p>
        </div>
      )}

      {/* 게임 규칙 설명 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">💡 비행기 선택 팁</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 다른 플레이어들의 선택을 예상해보세요</li>
          <li>• 승객 카드는 해당 비행기의 승객 수만큼 점수를 얻습니다</li>
          <li>• 추종자 카드는 가장 많은 승객이 있는 비행기에서만 점수를 얻습니다</li>
          <li>• 하이재커 카드는 다른 모든 카드를 무효화시킵니다</li>
        </ul>
      </div>
    </div>
  );
} 