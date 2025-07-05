'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameState } from '@/lib/hooks/useGameState';
import PlayerList from './components/PlayerList';
import GameBoard from './components/GameBoard';
import AirplaneSelection from './components/AirplaneSelection';
import DiscussionPhase from './components/DiscussionPhase';
import CardSelection from './components/CardSelection';
import ResultsPhase from './components/ResultsPhase';

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // 실시간 게임 상태
  const { gameState, loading, error, isConnected, refetch } = useGameState(roomCode, userId);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const storedUserId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');

    if (!storedUserId || !storedUsername) {
      router.push('/');
      return;
    }

    setUserId(storedUserId);
    setUsername(storedUsername);
    setIsInitialized(true);
  }, [router]);

  // 플레이어 액션 처리
  const handlePlayerAction = async (actionType: string, data?: any) => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/game/${roomCode}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          actionType,
          ...data
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 성공 시 게임 상태 새로고침
        await refetch();
      } else {
        alert(result.error || '액션 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Player action error:', error);
      alert('액션 처리 중 오류가 발생했습니다.');
    }
  };

  // 게임 시작
  const handleStartGame = async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode,
          userId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await refetch();
      } else {
        alert(result.error || '게임 시작에 실패했습니다.');
      }
    } catch (error) {
      console.error('Start game error:', error);
      alert('게임 시작 중 오류가 발생했습니다.');
    }
  };

  // 초기화되지 않았거나 로딩 중일 때
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">게임 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || !gameState.players) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">게임 상태를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.user_id === userId);
  const isHost = gameState.players[0]?.user_id === userId; // 첫 번째 플레이어가 방장

  // 게임 상태에 따른 컴포넌트 렌더링
  const renderGameContent = () => {
    if (!gameState || !gameState.players) {
      return <div>게임 데이터를 로딩 중입니다...</div>;
    }

    const phase = gameState.gameRoom.current_phase;

    switch (phase) {
      case 'waiting':
        return (
          <div className="space-y-6">
            <PlayerList 
              players={gameState.players}
              currentUserId={userId}
              onToggleReady={() => handlePlayerAction('toggle_ready')}
            />
            {isHost && (
              <div className="text-center">
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-lg"
                >
                  게임 시작
                </button>
              </div>
            )}
          </div>
        );

      case 'airplane_selection':
        return (
          <AirplaneSelection
            airplanes={gameState.airplanes || []}
            players={gameState.players}
            allPlayerActions={gameState.allPlayerActions || []}
            onSelectAirplane={(airplaneId: string) => handlePlayerAction('select_airplane', { airplaneId })}
            selectedAirplane={gameState.myActions?.[0]?.airplane_id}
            currentUserId={userId || ''}
          />
        );

      case 'discussion':
        return (
          <DiscussionPhase
            players={gameState.players}
            currentRound={gameState.currentRound}
            phaseStartTime={gameState.gameRoom.phase_start_time}
          />
        );

      case 'card_selection':
        return (
          <CardSelection
            cards={gameState.myCards || []}
            players={gameState.players}
            allPlayerActions={gameState.allPlayerActions || []}
            onSelectCard={(cardId: string) => handlePlayerAction('select_card', { cardId })}
            selectedCard={gameState.myActions?.[0]?.selected_card_id}
            currentUserId={userId || ''}
          />
        );

      case 'results':
        return (
          <ResultsPhase
            roomCode={roomCode}
            userId={userId}
            currentRound={gameState.currentRound}
          />
        );

      default:
        return <div>알 수 없는 게임 상태입니다.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">✈️ 비행기 하이재킹</h1>
              <p className="text-gray-600">룸 코드: <span className="font-mono font-semibold">{roomCode}</span></p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <p className="text-gray-600">플레이어: {username}</p>
                  <p className="text-gray-600">
                    라운드: {gameState?.gameRoom.current_round || 0}/5
                  </p>
                </div>
                {/* 연결 상태 표시 */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  isConnected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  } ${isConnected ? 'animate-pulse' : ''}`}></div>
                  <span>{isConnected ? '실시간 연결됨' : '연결 끊김'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 게임 보드 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {gameState && gameState.players && (
          <GameBoard
            gameRoom={gameState.gameRoom}
            players={gameState.players}
            currentPlayer={currentPlayer}
            hasActiveTimer={gameState.hasActiveTimer}
          />
        )}
        
        <div className="mt-8">
          {renderGameContent()}
        </div>
      </div>
    </div>
  );
} 