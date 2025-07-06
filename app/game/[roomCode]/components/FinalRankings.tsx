'use client';

import { useState, useEffect } from 'react';

interface FinalRankingsProps {
  roomCode: string;
}

interface PlayerRanking {
  id: string;
  username: string;
  total_score: number;
  rank: number;
}

export default function FinalRankings({ roomCode }: FinalRankingsProps) {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchFinalRankings();
  }, [roomCode]);

  const fetchFinalRankings = async () => {
    try {
      const response = await fetch(`/api/game/${roomCode}/final-rankings`);
      const result = await response.json();

      if (response.ok && result.data) {
        setRankings(result.data);
      } else {
        console.error('Final rankings error:', result.error);
      }
    } catch (error) {
      console.error('Fetch final rankings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewGame = async () => {
    setResetting(true);
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        // 게임방이 리셋되었으므로 페이지를 새로고침하여 새 게임을 시작
        window.location.reload();
      } else {
        console.error('Failed to reset game room');
        // 리셋 실패 시 메인 페이지로 이동
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Reset game room error:', error);
      // 에러 발생 시 메인 페이지로 이동
      window.location.href = '/';
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">최종 순위를 계산하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <h4 className="font-semibold text-gray-800 mb-3 text-center">🏆 최종 순위</h4>
      <div className="space-y-3">
        {rankings.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              index === 0 
                ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300' 
                : index === 1
                ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                : index === 2
                ? 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                index === 0 
                  ? 'bg-yellow-500 text-white' 
                  : index === 1
                  ? 'bg-gray-500 text-white'
                  : index === 2
                  ? 'bg-orange-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {index + 1}
              </div>
              <div>
                <div className="font-semibold text-gray-800 flex items-center space-x-2">
                  <span>{player.username}</span>
                  {index === 0 && <span className="text-xl">🏆</span>}
                  {index === 1 && <span className="text-xl">🥈</span>}
                  {index === 2 && <span className="text-xl">🥉</span>}
                </div>
                <div className="text-sm text-gray-600">
                  {index === 0 ? '우승자' : `${index + 1}위`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {player.total_score}점
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 게임 완료 메시지 */}
      <div className="mt-6 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-800 mb-2">🎮 게임 종료</h5>
          <p className="text-blue-700 text-sm">
            모든 플레이어가 5라운드를 완주했습니다!<br/>
            수고하셨습니다.
          </p>
          <button
            onClick={handleNewGame}
            disabled={resetting}
            className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {resetting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>게임 리셋 중...</span>
              </div>
            ) : (
              '새 게임 시작하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 