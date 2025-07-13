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
    <div 
      className="min-h-screen p-4 animate-fade-in"
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div className="flex items-center justify-center min-h-screen">
        <div 
          className="bg-white rounded-3xl shadow-strong p-8 w-full max-w-md animate-slide-up"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)'
          }}
        >
          <div className="text-center mb-8">
            <h1 
              className="text-5xl font-bold text-gray-800 mb-3"
              style={{ 
                fontSize: '2.5rem',
                fontWeight: '700',
                color: '#1f2937',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ✈️ 비행기 하이재킹
            </h1>
            <p 
              className="text-gray-600 text-lg font-medium"
              style={{ 
                color: '#6b7280',
                fontSize: '1.125rem',
                fontWeight: '500'
              }}
            >
              심리전과 추론이 필요한 카드 게임
            </p>
          </div>

          <div className="space-y-6">
            {/* 유저명 입력 */}
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-3"
                style={{ 
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                유저명
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="유저명을 입력하세요"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
                maxLength={20}
              />
            </div>

            {/* 게임 생성 */}
            <button
              onClick={handleCreateGame}
              disabled={isCreating || !username.trim()}
              className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
              style={{
                backgroundColor: isCreating || !username.trim() ? '#d1d5db' : '#3b82f6',
                color: '#ffffff',
                fontSize: '1.125rem',
                fontWeight: '600',
                borderRadius: '12px',
                cursor: isCreating || !username.trim() ? 'not-allowed' : 'pointer',
                transform: isCreating || !username.trim() ? 'none' : 'translateY(0)',
                boxShadow: isCreating || !username.trim() ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isCreating && username.trim()) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px 0 rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating && username.trim()) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {isCreating ? (
                <>
                  <div className="loading-spinner mr-3"></div>
                  게임 생성 중...
                </>
              ) : (
                '🎮 새 게임 만들기'
              )}
            </button>

            {/* 구분선 */}
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div 
                  className="w-full border-t"
                  style={{ borderColor: '#e5e7eb' }}
                ></div>
              </div>
              <div className="relative flex justify-center">
                <span 
                  className="px-4 bg-white text-gray-500 font-medium"
                  style={{ 
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  또는
                </span>
              </div>
            </div>

            {/* 게임 참가 */}
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-3"
                style={{ 
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                룸 코드
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="6자리 룸 코드"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  fontFamily: 'Monaco, monospace',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8b5cf6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
                maxLength={6}
              />
            </div>

            <button
              onClick={handleJoinGame}
              disabled={isJoining || !username.trim() || !roomCode.trim()}
              className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
              style={{
                backgroundColor: isJoining || !username.trim() || !roomCode.trim() ? '#d1d5db' : '#8b5cf6',
                color: '#ffffff',
                fontSize: '1.125rem',
                fontWeight: '600',
                borderRadius: '12px',
                cursor: isJoining || !username.trim() || !roomCode.trim() ? 'not-allowed' : 'pointer',
                transform: isJoining || !username.trim() || !roomCode.trim() ? 'none' : 'translateY(0)',
                boxShadow: isJoining || !username.trim() || !roomCode.trim() ? 'none' : '0 4px 14px 0 rgba(139, 92, 246, 0.3)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isJoining && username.trim() && roomCode.trim()) {
                  e.target.style.backgroundColor = '#7c3aed';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px 0 rgba(139, 92, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isJoining && username.trim() && roomCode.trim()) {
                  e.target.style.backgroundColor = '#8b5cf6';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 14px 0 rgba(139, 92, 246, 0.3)';
                }
              }}
            >
              {isJoining ? (
                <>
                  <div className="loading-spinner mr-3"></div>
                  게임 참가 중...
                </>
              ) : (
                '🚀 게임 참가하기'
              )}
            </button>
          </div>

          {/* 게임 설명 */}
          <div 
            className="mt-8 p-6 rounded-xl"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px'
            }}
          >
            <h3 
              className="font-bold text-gray-800 mb-3"
              style={{ 
                color: '#1f2937',
                fontSize: '1.125rem',
                fontWeight: '700'
              }}
            >
              🎯 게임 방법
            </h3>
            <ul className="text-gray-600 space-y-2">
              <li style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                • 2-8명이 함께 플레이
              </li>
              <li style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                • 5라운드 진행
              </li>
              <li style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                • 승객, 추종자, 하이재커 카드 사용
              </li>
              <li style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                • 심리전과 추론으로 승리하세요!
              </li>
            </ul>
          </div>

          {/* 관리자 링크 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/admin')}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
              style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#6b7280';
              }}
            >
              ⚙️ 관리자 페이지
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
