'use client';

import { useState, useEffect } from 'react';

interface DiscussionPhaseProps {
  players: any[];
  currentRound: any;
  phaseStartTime: string;
}

export default function DiscussionPhase({ 
  players, 
  currentRound, 
  phaseStartTime 
}: DiscussionPhaseProps) {
  const [timeRemaining, setTimeRemaining] = useState(120); // 2분

  useEffect(() => {
    if (!phaseStartTime) return;

    const startTime = new Date(phaseStartTime).getTime();
    const duration = 120 * 1000; // 2분

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phaseStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 60) return 'text-green-600';
    if (timeRemaining > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">💬 토론 시간</h2>
        <p className="text-gray-600">다른 플레이어들과 전략을 논의하세요</p>
      </div>

      {/* 타이머 */}
      <div className="text-center mb-8">
        <div className={`text-6xl font-bold ${getTimerColor()} mb-2`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${
              timeRemaining > 60 ? 'bg-green-500' : 
              timeRemaining > 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${(timeRemaining / 120) * 100}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          남은 시간: {formatTime(timeRemaining)}
        </p>
      </div>

      {/* 플레이어 상태 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">플레이어 현황</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">
                  {index === 0 && '👑 '}{player.username}
                </span>
                <span className="text-green-600 text-sm">
                  💭 토론 중
                </span>
              </div>
              <div className="text-sm text-gray-600">
                현재 점수: {player.total_score}점
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 토론 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">💡 토론 가이드</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• 다른 플레이어들과 어떤 비행기를 선택할지 논의해보세요</p>
          <p>• 하지만 너무 많은 정보를 공개하지 마세요!</p>
          <p>• 상대방의 의도를 파악하고 전략을 세워보세요</p>
          <p>• 블러핑(거짓 정보)도 전략의 일부입니다</p>
        </div>
      </div>

      {/* 채팅 영역 (미구현) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">채팅</h3>
        <div className="h-32 bg-white rounded border p-3 mb-3 overflow-y-auto">
          <p className="text-gray-500 text-sm text-center">
            채팅 기능은 추후 업데이트 예정입니다.<br/>
            현재는 음성이나 다른 채팅 도구를 이용해주세요.
          </p>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            disabled
          />
          <button
            className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
            disabled
          >
            전송
          </button>
        </div>
      </div>

      {/* 다음 단계 안내 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-800 font-medium">
          토론 시간이 끝나면 자동으로 카드 선택 단계로 넘어갑니다.
        </p>
      </div>
    </div>
  );
} 