'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GameRoom {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  current_phase: string;
  max_players: number;
  player_count: number;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: string;
  user_id: string;
  username: string;
  total_score: number;
  is_ready: boolean;
  actions: any[];
  cards: any[];
  selectedAirplane: {
    id: string;
    airplane_number: number;
  } | null;
  selectedCard: {
    id: string;
    card_type: string;
    is_used: boolean;
  } | null;
  actionCount: number;
  cardCount: number;
}

interface GameStats {
  totalPlayers: number;
  readyPlayers: number;
  playersWithActions: number;
  playersWithAirplane: number;
  playersWithCard: number;
}

export default function AdminPage() {
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all game rooms
  const fetchGameRooms = async () => {
    try {
      const response = await fetch('/api/admin/rooms');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch rooms');
      }
      const data = await response.json();
      setGameRooms(data.rooms || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch room details
  const fetchRoomDetails = async (roomCode: string) => {
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch room details');
      }
      const data = await response.json();
      setRoomDetails(data.room);
      setPlayers(data.players || []);
      setGameStats(data.gameStats || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching room details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Change game phase
  const changePhase = async (roomCode: string, phase: string) => {
    if (!confirm(`게임 단계를 '${getPhaseText(phase)}'로 변경하시겠습니까?`)) return;
    
    try {
      setError(null);
      const response = await fetch(`/api/admin/rooms/${roomCode}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change phase');
      }
      
      console.log(`[Admin] Phase changed to ${phase} for room ${roomCode}`);
      
      // Wait a moment for WebSocket notification to be sent, then refresh
      setTimeout(async () => {
        await fetchRoomDetails(roomCode);
        console.log(`[Admin] Room details refreshed after phase change`);
      }, 1000);
      
    } catch (err) {
      console.error('Error changing phase:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Delete a room
  const deleteRoom = async (roomCode: string) => {
    if (!confirm(`정말로 방 ${roomCode}를 삭제하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete room');
      
      await fetchGameRooms();
      if (selectedRoom === roomCode) {
        setSelectedRoom(null);
        setRoomDetails(null);
        setPlayers([]);
        setGameStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Force start a game
  const forceStartGame = async (roomCode: string) => {
    if (!confirm(`방 ${roomCode}의 게임을 강제로 시작하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}/start`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start game');
      
      await fetchRoomDetails(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Reset a room
  const resetRoom = async (roomCode: string) => {
    if (!confirm(`방 ${roomCode}를 초기화하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}/reset`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to reset room');
      
      await fetchRoomDetails(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Start next round
  const startNextRound = async (roomCode: string) => {
    if (!confirm(`방 ${roomCode}의 다음 라운드를 시작하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}/next-round`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start next round');
      }
      
      await fetchRoomDetails(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Finish game
  const finishGame = async (roomCode: string) => {
    if (!confirm(`방 ${roomCode}의 게임을 강제로 종료하시겠습니까?\n현재 라운드에서 게임이 종료되고 최종 결과 페이지로 이동합니다.`)) return;
    
    try {
      const response = await fetch(`/api/admin/rooms/${roomCode}/finish`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finish game');
      }
      
      await fetchRoomDetails(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchGameRooms();
    
    const interval = setInterval(fetchGameRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomDetails(selectedRoom);
      
      const interval = setInterval(() => fetchRoomDetails(selectedRoom), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'playing': return 'text-green-600 bg-green-100';
      case 'finished': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'airplane_selection': return '비행기 선택';
      case 'card_selection': return '카드 선택';
      case 'discussion': return '토론';
      case 'results': return '결과';
      default: return phase;
    }
  };

  const getCardTypeText = (cardType: string) => {
    switch (cardType) {
      case 'passenger': return '승객';
      case 'hijacker': return '하이재커';
      case 'follower': return '추종자';
      default: return cardType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              🎮 게임 관리자 페이지
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={fetchGameRooms}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              🔄 새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rooms List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  🏠 게임 방 목록 ({gameRooms.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {gameRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoom === room.room_code
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRoom(room.room_code)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">🎯 {room.room_code}</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        👥 플레이어: {room.player_count}/{room.max_players}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        🎲 라운드: {room.current_round} | {getPhaseText(room.current_phase)}
                      </div>
                    </div>
                  ))}
                  {gameRooms.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      📭 생성된 게임 방이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Room Details */}
          <div className="lg:col-span-2">
            {selectedRoom ? (
              <div className="space-y-6">
                {/* Room Info & Controls */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        🎯 방 정보: {selectedRoom}
                      </h3>
                      <div className="flex space-x-2">
                        {roomDetails?.status === 'waiting' && (
                          <button
                            onClick={() => forceStartGame(selectedRoom)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            ▶️ 게임 시작
                          </button>
                        )}
                        {roomDetails?.status === 'playing' && roomDetails?.current_phase === 'results' && roomDetails?.current_round < 5 && (
                          <button
                            onClick={() => startNextRound(selectedRoom)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            ⏭️ 다음 라운드
                          </button>
                        )}
                        {roomDetails?.status === 'playing' && (
                          <button
                            onClick={() => finishGame(selectedRoom)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            🏁 게임 종료
                          </button>
                        )}
                        <button
                          onClick={() => resetRoom(selectedRoom)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          🔄 초기화
                        </button>
                        <button
                          onClick={() => deleteRoom(selectedRoom)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>
                    
                    {roomDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">📊 상태</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(roomDetails.status)}`}>
                              {roomDetails.status}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">🎲 현재 라운드</dt>
                          <dd className="mt-1 text-sm text-gray-900">{roomDetails.current_round}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">⏱️ 현재 단계</dt>
                          <dd className="mt-1 text-sm text-gray-900">{getPhaseText(roomDetails.current_phase)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">👥 플레이어 수</dt>
                          <dd className="mt-1 text-sm text-gray-900">{players.length}/{roomDetails.max_players}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">🕐 생성 시간</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(roomDetails.created_at).toLocaleString('ko-KR')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">🔄 마지막 업데이트</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(roomDetails.updated_at).toLocaleString('ko-KR')}
                          </dd>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase Management */}
                {roomDetails?.status === 'playing' && (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        ⚙️ 단계 관리
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { phase: 'airplane_selection', icon: '✈️', text: '비행기 선택' },
                          { phase: 'discussion', icon: '💬', text: '토론' },
                          { phase: 'card_selection', icon: '🃏', text: '카드 선택' },
                          { phase: 'results', icon: '📊', text: '결과' }
                        ].map(({ phase, icon, text }) => (
                          <button
                            key={phase}
                            onClick={() => changePhase(selectedRoom, phase)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                              roomDetails.current_phase === phase
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {icon} {text}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Statistics */}
                {gameStats && (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        📈 게임 통계
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{gameStats.totalPlayers}</div>
                          <div className="text-sm text-gray-500">👥 총 플레이어</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{gameStats.readyPlayers}</div>
                          <div className="text-sm text-gray-500">✅ 준비완료</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{gameStats.playersWithActions}</div>
                          <div className="text-sm text-gray-500">🎯 액션 수행</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{gameStats.playersWithAirplane}</div>
                          <div className="text-sm text-gray-500">✈️ 비행기 선택</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{gameStats.playersWithCard}</div>
                          <div className="text-sm text-gray-500">🃏 카드 선택</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Players List with Details */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      👥 플레이어 상세 현황 ({players.length})
                    </h3>
                    <div className="space-y-4">
                      {players.map((player) => (
                        <div key={player.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                👤 {player.username}
                                {player.is_ready && <span className="ml-2 text-green-600">✅</span>}
                              </div>
                              <div className="text-sm text-gray-500">ID: {player.user_id}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-indigo-600">🏆 {player.total_score}점</div>
                              <div className={`text-sm ${player.is_ready ? 'text-green-600' : 'text-red-600'}`}>
                                {player.is_ready ? '✅ 준비완료' : '⏳ 준비중'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-medium text-blue-800">✈️ 비행기 선택</div>
                              <div className="text-blue-600">
                                {player.selectedAirplane ? 
                                  `${player.selectedAirplane.airplane_number}번 비행기` : 
                                  '선택하지 않음'
                                }
                              </div>
                            </div>
                            
                            <div className="bg-green-50 p-3 rounded">
                              <div className="font-medium text-green-800">🃏 카드 선택</div>
                              <div className="text-green-600">
                                {player.selectedCard ? 
                                  `${getCardTypeText(player.selectedCard.card_type)} ${player.selectedCard.is_used ? '(사용됨)' : ''}` : 
                                  '선택하지 않음'
                                }
                              </div>
                            </div>
                            
                            <div className="bg-purple-50 p-3 rounded">
                              <div className="font-medium text-purple-800">📊 게임 정보</div>
                              <div className="text-purple-600">
                                액션: {player.actionCount}개 | 카드: {player.cardCount}개
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {players.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          📭 참여한 플레이어가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  👈 왼쪽에서 게임 방을 선택하세요.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 