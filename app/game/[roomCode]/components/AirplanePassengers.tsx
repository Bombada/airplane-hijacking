'use client';

interface AirplanePassengersProps {
  airplanes: any[];
  players: any[];
  allPlayerActions: any[];
}

export default function AirplanePassengers({ airplanes, players, allPlayerActions }: AirplanePassengersProps) {
  // 비행기별 탑승 인원 계산
  const passengersByAirplane = airplanes.reduce((acc, airplane) => {
    const passengers = allPlayerActions
      .filter(action => action.airplane_id === airplane.id)
      .map(action => {
        const player = players.find(p => p.id === action.player_id);
        return player?.username || 'Unknown';
      });
    
    acc[airplane.airplane_number] = passengers;
    return acc;
  }, {} as Record<number, string[]>);

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold">현재 비행기 탑승 현황</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(passengersByAirplane).map(([airplaneNumber, passengers]) => (
          <div key={airplaneNumber} className="p-4 border rounded-lg bg-white/5">
            <h4 className="font-medium">비행기 {airplaneNumber}번</h4>
            <div className="mt-2">
              {passengers.length > 0 ? (
                <ul className="list-disc list-inside">
                  {passengers.map((username, idx) => (
                    <li key={idx} className="text-sm">{username}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">탑승객 없음</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 