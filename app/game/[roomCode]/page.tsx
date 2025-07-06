'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStateWS } from '@/lib/hooks/useGameStateWS';
import PlayerList from './components/PlayerList';
import GameBoard from './components/GameBoard';
import AirplaneSelection from './components/AirplaneSelection';
import DiscussionPhase from './components/DiscussionPhase';
import CardSelection from './components/CardSelection';
import ResultsPhase from './components/ResultsPhase';
import FinalRankings from './components/FinalRankings';

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 로컬 카드 선택 상태 (즉시 UI 업데이트용)
  const [localSelectedCard, setLocalSelectedCard] = useState<string | undefined>(undefined);

  // 실시간 게임 상태 (WebSocket)
  const { gameState, loading, error, isConnected, sendAction, sendCountdownMessage, refetch, countdownState } = useGameStateWS(roomCode, userId);

  // 자동 게임 시작 카운트다운
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const [autoStartActive, setAutoStartActive] = useState(false);

  // Debug logging for game state
  useEffect(() => {
    if (gameState) {
      console.log('[GamePage] Game state received:', {
        gameRoom: gameState.gameRoom?.room_code,
        players: gameState.players?.length,
        currentPlayer: gameState.currentPlayer?.username,
        currentRound: gameState.currentRound?.round_number,
        airplanes: gameState.airplanes?.length,
        myCards: gameState.myCards?.length,
        myActions: gameState.myActions?.length,
        allPlayerActions: gameState.allPlayerActions?.length,
        fullAirplanes: gameState.airplanes
      });
    }
  }, [gameState]);

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

  // 페이즈 변경 시 로컬 카드 선택 상태 초기화
  useEffect(() => {
    if (gameState?.gameRoom.current_phase !== 'card_selection') {
      setLocalSelectedCard(undefined);
    }
  }, [gameState?.gameRoom.current_phase]);

  // 자동 게임 시작 체크
  useEffect(() => {
    if (!gameState || !gameState.players) {
      console.log('[GamePage] No gameState or players');
      return;
    }
    
    const isWaitingPhase = gameState.gameRoom.current_phase === 'waiting';
    const hasMinPlayers = gameState.players.length >= 2;
    const allPlayersReady = gameState.players.every(p => p.is_ready);
    
    console.log('[GamePage] Auto start check:', {
      isWaitingPhase,
      hasMinPlayers,
      allPlayersReady,
      autoStartActive,
      playersCount: gameState.players.length,
      readyPlayers: gameState.players.filter(p => p.is_ready).length,
      players: gameState.players.map(p => ({ username: p.username, is_ready: p.is_ready }))
    });
    
    // 방장만 타이머를 시작하도록 제한
    const isHost = gameState.players[0]?.user_id === userId;
    
    if (isWaitingPhase && hasMinPlayers && allPlayersReady && !autoStartActive && isHost) {
      console.log('[GamePage] All players ready, starting countdown (host only)...');
      setAutoStartActive(true);
      setAutoStartCountdown(5);
      
      // 웹소켓을 통해 타이머 시작 알림
      sendCountdownMessage('countdown_start', 5);
      
      const countdownInterval = setInterval(() => {
        setAutoStartCountdown(prev => {
          console.log('[GamePage] Countdown:', prev);
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setAutoStartActive(false);
            setAutoStartCountdown(null);
            console.log('[GamePage] Starting game...');
            // 게임 시작 API 호출
            fetch('/api/game/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                roomCode,
                userId
              }),
            }).then(response => {
              if (response.ok) {
                console.log('[GamePage] Game started successfully');
                setTimeout(() => refetch(), 500);
              } else {
                console.error('Start game failed');
              }
            }).catch(error => {
              console.error('Start game error:', error);
            });
            return null;
          }
          // 웹소켓을 통해 타이머 업데이트 브로드캐스트
          const newCountdown = prev - 1;
          sendCountdownMessage('countdown_update', newCountdown);
          return newCountdown;
        });
      }, 1000);
      
      return () => {
        console.log('[GamePage] Clearing countdown interval');
        clearInterval(countdownInterval);
      };
    } else if (isWaitingPhase && (!hasMinPlayers || !allPlayersReady) && autoStartActive) {
      // 조건이 더 이상 만족되지 않으면 카운트다운 중지
      console.log('[GamePage] Conditions no longer met, stopping countdown');
      setAutoStartActive(false);
      setAutoStartCountdown(null);
    }
  }, [gameState?.players, gameState?.gameRoom.current_phase, autoStartActive, roomCode, userId, refetch]);

  // 플레이어 액션 처리 (WebSocket)
  const handlePlayerAction = (actionType: string, airplaneId?: string, cardId?: string) => {
    if (!userId) return;
    console.log(`[GamePage] WebSocket action: ${actionType}`);
    sendAction(actionType, airplaneId, cardId);
  };

  // 카드 선택 처리 (로컬 상태 + 서버 전송)
  const handleCardSelection = (cardId: string) => {
    if (!userId) return;
    
    console.log(`[GamePage] Local card selection: ${cardId}`);
    
    // 즉시 로컬 UI 업데이트
    setLocalSelectedCard(cardId);
    
    // 백그라운드에서 서버에 전송 (UI 업데이트와 독립적)
    sendAction('select_card', undefined, cardId);
  };

  // 게임 시작
  const handleStartGame = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[GamePage] Starting game for room:', roomCode);
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

      if (response.ok) {
        console.log('[GamePage] Game started successfully');
        // WebSocket으로 게임 시작 알림
        setTimeout(() => refetch(), 500);
      } else {
        const result = await response.json();
        console.error('Start game failed:', result.error);
      }
    } catch (error) {
      console.error('Start game error:', error);
    }
  }, [roomCode, userId, refetch]);

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

    // 게임이 완료된 경우 최종 결과 페이지 표시
    if (gameState.gameRoom.status === 'finished') {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              🎉 게임 완료!
            </h2>
            <p className="text-gray-600">게임이 종료되었습니다.</p>
          </div>
          
          <FinalRankings roomCode={roomCode} />
        </div>
      );
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
              autoStartTime={gameState.autoStartTime}
              roomCode={roomCode}
            />
            {((autoStartActive && autoStartCountdown !== null) || (countdownState.active && countdownState.countdown !== null)) && (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {autoStartCountdown !== null ? autoStartCountdown : countdownState.countdown}
                      </span>
                    </div>
                    <span className="text-green-800 font-semibold text-lg">
                      {autoStartCountdown !== null ? autoStartCountdown : countdownState.countdown}초 후 게임이 시작됩니다!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'airplane_selection':
        // Find the correct current player using userId
        const actualCurrentPlayer = gameState.players.find(p => p.user_id === userId);
        
        // Find the current user's airplane selection directly from allPlayerActions
        // This is more reliable than using myActions which might have wrong data
        let selectedAirplane: string | undefined;
        
        if (actualCurrentPlayer) {
          const myAirplaneAction = gameState.allPlayerActions?.find(action => {
            const actionType = action.action_type || action.actionType;
            return action.player_id === actualCurrentPlayer.id && 
                   (actionType === 'select_airplane' || (action.airplane_id && !action.selected_card_id && !actionType));
          });
          selectedAirplane = myAirplaneAction?.airplane_id;
        }
        
        // Fallback: try myActions if allPlayerActions didn't work
        if (!selectedAirplane) {
          const myActionsFallback = gameState.myActions?.find(action => {
            const actionType = action.action_type || action.actionType;
            return actionType === 'select_airplane' || (action.airplane_id && !action.selected_card_id && !actionType);
          });
          selectedAirplane = myActionsFallback?.airplane_id;
        }
        
        // Debug logging to understand the data structure
        console.log('[Page] Airplane selection debugging:', {
          userId,
          actualCurrentPlayer,
          selectedAirplane,
          playerMismatch: gameState.currentPlayer?.user_id !== userId,
          myActionsFromMyActions: gameState.myActions?.map(action => ({
            id: action.id,
            player_id: action.player_id,
            action_type: action.action_type,
            actionType: action.actionType,
            airplane_id: action.airplane_id,
            selected_card_id: action.selected_card_id
          })),
          myActionsFromAllPlayerActions: gameState.allPlayerActions?.filter(action => 
            action.player_id === actualCurrentPlayer?.id
          ).map(action => ({
            id: action.id,
            player_id: action.player_id,
            action_type: action.action_type,
            actionType: action.actionType,
            airplane_id: action.airplane_id,
            selected_card_id: action.selected_card_id
          }))
        });
        
        return (
          <AirplaneSelection
            airplanes={gameState.airplanes || []}
            players={gameState.players}
            allPlayerActions={gameState.allPlayerActions || []}
            onSelectAirplane={(airplaneId: string) => handlePlayerAction('select_airplane', airplaneId)}
            selectedAirplane={selectedAirplane}
            currentUserId={userId || ''}
            phaseStartTime={gameState.gameRoom.phase_start_time}
            roomCode={roomCode}
          />
        );

      case 'discussion':
        return (
          <DiscussionPhase 
            players={gameState.players} 
            currentRound={gameState.currentRound}
            phaseStartTime={gameState.gameRoom.phase_start_time}
            roomCode={roomCode}
            airplanes={gameState.airplanes || []}
            allPlayerActions={gameState.allPlayerActions || []}
            myCards={gameState.myCards || []}
            currentUserId={userId || ''}
          />
        );
      case 'card_selection':
        // 로컬 선택 상태를 우선적으로 사용 (즉시 UI 반영)
        let selectedCard: string | undefined = localSelectedCard;
        
        // 로컬 상태가 없으면 서버 상태에서 가져오기 (초기 로드 시)
        if (!selectedCard) {
          // Find the correct current player using userId
          const actualCurrentPlayerCard = gameState.players.find(p => p.user_id === userId);
          
          if (actualCurrentPlayerCard) {
            const myCardAction = gameState.allPlayerActions?.find(action => {
              const actionType = action.action_type || action.actionType;
              return action.player_id === actualCurrentPlayerCard.id && 
                     (actionType === 'select_card' || action.selected_card_id);
            });
            selectedCard = myCardAction?.selected_card_id;
          }
          
          // Fallback: try myActions if allPlayerActions didn't work
          if (!selectedCard) {
            const myCardActionFallback = gameState.myActions?.find(action => {
              const actionType = action.action_type || action.actionType;
              return actionType === 'select_card' || action.selected_card_id;
            });
            selectedCard = myCardActionFallback?.selected_card_id;
          }
          
          // 서버에서 가져온 상태를 로컬 상태에 동기화
          if (selectedCard) {
            setLocalSelectedCard(selectedCard);
          }
        }
        
        console.log('[Page] Card selection state:', {
          localSelectedCard,
          finalSelectedCard: selectedCard,
          usingLocal: !!localSelectedCard
        });
        
        return (
          <CardSelection 
            cards={gameState.myCards || []} 
            onSelectCard={handleCardSelection}
            selectedCard={selectedCard}
            phaseStartTime={gameState.gameRoom.phase_start_time}
            roomCode={roomCode}
            airplanes={gameState.airplanes}
            players={gameState.players}
            allPlayerActions={gameState.allPlayerActions}
          />
        );

      case 'results':
        return (
          <ResultsPhase 
            roomCode={roomCode}
            userId={userId}
            currentRound={gameState.currentRound}
            phaseStartTime={gameState.gameRoom.phase_start_time}
            airplanes={gameState.airplanes}
            players={gameState.players}
            allPlayerActions={gameState.allPlayerActions}
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