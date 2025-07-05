'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateGame = async () => {
    if (!username.trim()) {
      alert('유저명을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const userId = generateUserId();
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          userId
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', username.trim());
        
        // 게임 룸으로 이동
        router.push(`/game/${result.data.room_code}`);
      } else {
        alert(result.error || '게임 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Create game error:', error);
      alert('게임 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!username.trim()) {
      alert('유저명을 입력해주세요.');
      return;
    }

    if (!roomCode.trim()) {
      alert('룸 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);
    try {
      const userId = generateUserId();
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          username: username.trim(),
          userId
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', username.trim());
        
        // 게임 룸으로 이동
        router.push(`/game/${result.data.room_code}`);
      } else {
        alert(result.error || '게임 참가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Join game error:', error);
      alert('게임 참가 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">✈️ 비행기 하이재킹</h1>
          <p className="text-gray-600">심리전과 추론이 필요한 카드 게임</p>
        </div>

        <div className="space-y-6">
          {/* 유저명 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              유저명
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="유저명을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              maxLength={20}
            />
          </div>

          {/* 게임 생성 */}
          <button
            onClick={handleCreateGame}
            disabled={isCreating || !username.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                게임 생성 중...
              </>
            ) : (
              '새 게임 만들기'
            )}
          </button>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 게임 참가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              룸 코드
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="6자리 룸 코드"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-lg font-mono tracking-wider"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleJoinGame}
            disabled={isJoining || !username.trim() || !roomCode.trim()}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                게임 참가 중...
              </>
            ) : (
              '게임 참가하기'
            )}
          </button>
        </div>

        {/* 게임 설명 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">게임 방법</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 2-8명이 함께 플레이</li>
            <li>• 5라운드 진행</li>
            <li>• 승객, 추종자, 하이재커 카드 사용</li>
            <li>• 심리전과 추론으로 승리하세요!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
