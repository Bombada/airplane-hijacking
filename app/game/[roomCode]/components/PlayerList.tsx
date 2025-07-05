'use client';

interface Player {
  id: string;
  username: string;
  total_score: number;
  is_ready: boolean;
  user_id: string;
}

interface PlayerListProps {
  players: Player[];
  currentUserId: string;
  onToggleReady: () => void;
}

export default function PlayerList({ players, currentUserId, onToggleReady }: PlayerListProps) {
  const currentPlayer = players.find(p => p.user_id === currentUserId);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">플레이어 목록</h2>
        <span className="text-sm text-gray-600">{players.length}/8명</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              player.user_id === currentUserId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">
                {index === 0 && '👑 '}{player.username}
              </span>
              {player.is_ready ? (
                <span className="text-green-600 text-sm">✓ 준비완료</span>
              ) : (
                <span className="text-gray-400 text-sm">대기중</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              점수: {player.total_score}점
            </div>
          </div>
        ))}

        {/* 빈 슬롯 표시 */}
        {Array.from({ length: 8 - players.length }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center"
          >
            <span className="text-gray-400 text-sm">빈 자리</span>
          </div>
        ))}
      </div>

      {/* 준비 버튼 */}
      {currentPlayer && (
        <div className="text-center">
          <button
            onClick={onToggleReady}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentPlayer.is_ready
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {currentPlayer.is_ready ? '준비 취소' : '준비 완료'}
          </button>
        </div>
      )}

      {/* 게임 시작 조건 안내 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>게임 시작 조건:</strong> 최소 2명 이상, 모든 플레이어가 준비 완료 상태
        </p>
      </div>
    </div>
  );
} 