'use client';

import { useRealtime } from '@/lib/hooks/useRealtime';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestRealtimePage() {
  const [roomCode, setRoomCode] = useState('test-room-123');
  const [envStatus, setEnvStatus] = useState<{
    url: string;
    keySet: boolean;
    isValid: boolean;
    websocketUrl: string;
  }>({
    url: '',
    keySet: false,
    isValid: false,
    websocketUrl: '',
  });
  
  const realtimeData = useRealtime(roomCode);

  useEffect(() => {
    // 환경변수 상태 확인
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const keySet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isValid = url !== 'https://your-project.supabase.co' && keySet;
    
    // WebSocket URL 구성
    const actualUrl = url || 'https://your-project.supabase.co';
    const actualKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
    const websocketUrl = `${actualUrl.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${actualKey}&eventsPerSecond=10&vsn=1.0.0`;
    
    setEnvStatus({ url, keySet, isValid, websocketUrl });
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('연결 테스트 실패:', error);
        alert('연결 테스트 실패: ' + error.message);
      } else {
        console.log('연결 테스트 성공:', data);
        alert('연결 테스트 성공!');
      }
    } catch (err) {
      console.error('연결 테스트 오류:', err);
      alert('연결 테스트 오류: ' + err);
    }
  };

  const createEnvFile = () => {
    const envContent = `# Supabase Configuration
# Replace these with your actual Supabase project URL and anon key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side Supabase Configuration (same values)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key`;

    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env.local';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase Realtime 테스트</h1>
      
      {/* 환경변수 상태 */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">환경변수 상태</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Supabase URL:</span>{' '}
            <span className={envStatus.url.includes('your-project') ? 'text-red-600' : 'text-green-600'}>
              {envStatus.url || '설정되지 않음'}
            </span>
          </p>
          <p>
            <span className="font-medium">Anon Key:</span>{' '}
            <span className={envStatus.keySet ? 'text-green-600' : 'text-red-600'}>
              {envStatus.keySet ? '설정됨' : '설정되지 않음'}
            </span>
          </p>
          <p>
            <span className="font-medium">WebSocket URL:</span>{' '}
            <span className={envStatus.websocketUrl.includes('your-project') ? 'text-red-600' : 'text-green-600'}>
              {envStatus.websocketUrl}
            </span>
          </p>
          <p>
            <span className="font-medium">설정 상태:</span>{' '}
            <span className={envStatus.isValid ? 'text-green-600' : 'text-red-600'}>
              {envStatus.isValid ? '올바름' : '설정 필요'}
            </span>
          </p>
        </div>
        
        {!envStatus.isValid && (
          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 rounded">
            <p className="text-sm text-yellow-800">
              <strong>설정 방법:</strong><br/>
              1. 프로젝트 루트에 <code>.env.local</code> 파일 생성<br/>
              2. 다음 내용 추가:<br/>
              <code className="block mt-2 p-2 bg-gray-100 rounded">
                NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co<br/>
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key<br/>
                SUPABASE_URL=https://your-project.supabase.co<br/>
                SUPABASE_ANON_KEY=your-anon-key
              </code><br/>
              3. 개발 서버 재시작
            </p>
            <button
              onClick={createEnvFile}
              className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
            >
              .env.local 템플릿 다운로드
            </button>
          </div>
        )}
        
        <div className="mt-3 flex gap-2">
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            연결 테스트
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Room Code:
        </label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-64"
          placeholder="Enter room code"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">연결 상태</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">연결 상태:</span>{' '}
              <span className={realtimeData.isConnected ? 'text-green-600' : 'text-red-600'}>
                {realtimeData.isConnected ? '연결됨' : '연결 안됨'}
              </span>
            </p>
            <p>
              <span className="font-medium">마지막 업데이트:</span>{' '}
              {realtimeData.lastUpdate ? realtimeData.lastUpdate.toLocaleTimeString() : '없음'}
            </p>
            <p>
              <span className="font-medium">현재 Room:</span> {roomCode}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">게임룸 변경사항</h2>
          <div className="max-h-40 overflow-y-auto">
            {realtimeData.gameRooms.length === 0 ? (
              <p className="text-gray-500">변경사항 없음</p>
            ) : (
              <ul className="space-y-2">
                {realtimeData.gameRooms.map((room, index) => (
                  <li key={index} className="text-sm bg-white p-2 rounded">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(room, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">플레이어 변경사항</h2>
          <div className="max-h-40 overflow-y-auto">
            {realtimeData.players.length === 0 ? (
              <p className="text-gray-500">변경사항 없음</p>
            ) : (
              <ul className="space-y-2">
                {realtimeData.players.map((player, index) => (
                  <li key={index} className="text-sm bg-white p-2 rounded">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(player, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">테스트 가이드</h2>
          <div className="text-sm space-y-2">
            <p><strong>1단계:</strong> Supabase 프로젝트 생성</p>
            <p><strong>2단계:</strong> .env.local에 URL과 키 설정</p>
            <p><strong>3단계:</strong> game_rooms, players 테이블 생성</p>
            <p><strong>4단계:</strong> Realtime 활성화</p>
            <p><strong>5단계:</strong> 다른 탭에서 데이터 변경 테스트</p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">디버깅 정보</h3>
        <p className="text-sm text-gray-600 mb-2">
          브라우저 개발자 도구의 Console 탭에서 실시간 로그를 확인할 수 있습니다.
        </p>
        <div className="text-xs bg-white p-2 rounded border">
          <p><strong>현재 WebSocket 연결 URL:</strong></p>
          <code className="break-all">{envStatus.websocketUrl}</code>
        </div>
      </div>
    </div>
  );
} 