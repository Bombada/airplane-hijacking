'use client';

import { useState, useEffect } from 'react';

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
  autoStartTime?: string;
  roomCode: string;
}

export default function PlayerList({ players, currentUserId, onToggleReady, autoStartTime, roomCode }: PlayerListProps) {
  const currentPlayer = players.find(p => p.user_id === currentUserId);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // 게임 시작 조건 체크
  const hasMinPlayers = players.length >= 2;
  const allPlayersReady = players.every(p => p.is_ready);
  const canStartGame = hasMinPlayers && allPlayersReady;

  // 자동 시작 타이머 (DiscussionPhase와 동일한 방식)
  useEffect(() => {
    if (!autoStartTime) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(autoStartTime).getTime();
    const duration = 5 * 1000; // 5초

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        // 타이머 종료 시 게임 시작 API 호출
        handleAutoStart();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoStartTime]);

  const handleAutoStart = async () => {
    try {
      // Get the current server port from the window location
      const port = window.location.port;
      const baseUrl = port ? `http://localhost:${port}` : window.location.origin;
      
      const response = await fetch(`${baseUrl}/api/admin/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('게임이 자동으로 시작되었습니다.');
      } else {
        console.error('게임 시작 실패:', response.status);
      }
    } catch (error) {
      console.error('게임 시작 중 오류 발생:', error);
    }
  };

  const formatTime = (seconds: number) => {
    return `${seconds}초`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-600';
    if (timeRemaining > 3) return 'text-green-600';
    if (timeRemaining > 1) return 'text-yellow-600';
    return 'text-red-600';
  };

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
      <div className={`mt-4 p-3 rounded-lg border ${
        canStartGame 
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <p className={`text-sm ${
          canStartGame 
            ? 'text-green-800'
            : 'text-yellow-800'
        }`}>
          {canStartGame ? (
            <>
              <strong>🎉 게임 시작 준비 완료!</strong>
              {timeRemaining !== null && timeRemaining > 0 ? (
                <span className="block mt-2">
                  <span className={`text-2xl font-bold ${getTimerColor()}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-xs block">후 자동으로 게임이 시작됩니다.</span>
                </span>
              ) : (
                <span className="block mt-1">곧 게임이 시작됩니다!</span>
              )}
            </>
          ) : (
            <>
              <strong>게임 시작 조건:</strong> 최소 2명 이상, 모든 플레이어가 준비 완료 상태
              {!hasMinPlayers && (
                <span className="block mt-1 text-xs">
                  • 현재 {players.length}명 (최소 2명 필요)
                </span>
              )}
              {hasMinPlayers && !allPlayersReady && (
                <span className="block mt-1 text-xs">
                  • {players.filter(p => !p.is_ready).length}명이 아직 준비하지 않음
                </span>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
} 