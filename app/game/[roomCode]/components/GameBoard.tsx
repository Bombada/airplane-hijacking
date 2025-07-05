'use client';

import { useState, useEffect } from 'react';

interface GameBoardProps {
  gameRoom: any;
  players: any[];
  currentPlayer: any;
  hasActiveTimer?: boolean;
}

export default function GameBoard({ gameRoom, players, currentPlayer, hasActiveTimer = false }: GameBoardProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (hasActiveTimer) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [hasActiveTimer]);

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case 'waiting':
        return '게임 대기 중';
      case 'airplane_selection':
        return '비행기 선택';
      case 'discussion':
        return '토론 시간';
      case 'card_selection':
        return '카드 선택';
      case 'results':
        return '결과 발표';
      default:
        return '알 수 없는 상태';
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'waiting':
        return '모든 플레이어가 준비될 때까지 기다리고 있습니다.';
      case 'airplane_selection':
        return '탑승할 비행기를 선택하세요.';
      case 'discussion':
        return '다른 플레이어들과 전략을 논의하세요.';
      case 'card_selection':
        return '사용할 카드를 선택하세요.';
      case 'results':
        return '라운드 결과를 확인하세요.';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'playing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'finished':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 게임 상태 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {getPhaseTitle(gameRoom.current_phase)}
          </h2>
          <p className="text-gray-600">{getPhaseDescription(gameRoom.current_phase)}</p>
          
          {/* 타이머 표시 */}
          {hasActiveTimer && (
            <div className="mt-3 flex items-center space-x-2">
              <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-800 font-semibold">
                  {countdown}초 후 자동으로 다음 단계로 넘어갑니다
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 sm:mt-0">
          <div className={`px-4 py-2 rounded-lg border ${getStatusColor(gameRoom.status)}`}>
            <span className="font-semibold">
              {gameRoom.status === 'waiting' && '대기 중'}
              {gameRoom.status === 'playing' && '진행 중'}
              {gameRoom.status === 'finished' && '완료'}
            </span>
          </div>
        </div>
      </div>

      {/* 게임 진행 정보 */}
      {gameRoom.status === 'playing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 라운드 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">라운드 정보</h3>
            <p className="text-blue-700">
              {gameRoom.current_round} / 5 라운드
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(gameRoom.current_round / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 내 정보 */}
          {currentPlayer && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">내 정보</h3>
              <p className="text-green-700">
                총 점수: {currentPlayer.total_score}점
              </p>
              <p className="text-green-700">
                플레이어: {currentPlayer.username}
              </p>
            </div>
          )}

          {/* 플레이어 수 */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">참가자</h3>
            <p className="text-purple-700">
              {players.length}명 참가 중
            </p>
            <div className="flex -space-x-2 mt-2">
              {players.slice(0, 6).map((player, index) => (
                <div
                  key={player.id}
                  className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white"
                  title={player.username}
                >
                  {player.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {players.length > 6 && (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                  +{players.length - 6}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 순위표 (게임 진행 중일 때만) */}
      {gameRoom.status === 'playing' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">현재 순위</h3>
          <div className="space-y-2">
            {players
              .sort((a, b) => b.total_score - a.total_score)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    player.user_id === currentPlayer?.user_id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-600 w-6">
                      {index + 1}위
                    </span>
                    <span className="font-medium">
                      {player.username}
                      {index === 0 && ' 🏆'}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800">
                    {player.total_score}점
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
} 