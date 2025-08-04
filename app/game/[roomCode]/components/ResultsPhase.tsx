'use client';

import { useState, useEffect } from 'react';
import FinalRankings from './FinalRankings';
import { getPhaseTimeLimit } from '@/lib/game/gameLogic';

interface ResultsPhaseProps {
  roomCode: string;
  userId: string | null;
  currentRound: any;
  phaseStartTime: string;  // Add phaseStartTime prop
}

export default function ResultsPhase({ 
  roomCode, 
  userId, 
  currentRound,
  phaseStartTime  // Add phaseStartTime parameter
}: ResultsPhaseProps) {
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [resultsCalculated, setResultsCalculated] = useState(false);
  const [lastCalculatedRound, setLastCalculatedRound] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);  // Add timer state
  const [nextRoundAttempted, setNextRoundAttempted] = useState(false);  // Add to prevent race condition

  const calculateResults = async () => {
    if (!userId || calculating || resultsCalculated) return;
    
    // Prevent multiple calculations for the same round
    if (lastCalculatedRound === currentRound?.round_number) {
      console.log('[ResultsPhase] Results already calculated for this round');
      return;
    }

    setCalculating(true);
    try {
      const response = await fetch(`/api/game/${roomCode}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          roundNumber: currentRound?.round_number,
          requestId: `${userId}-${currentRound?.round_number}-${Date.now()}`
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setResults(result.data);
        setResultsCalculated(true);
        setLastCalculatedRound(currentRound?.round_number || null);
        console.log('[ResultsPhase] Results calculated successfully');
      } else {
        console.error('Results calculation error:', result.error);
      }
    } catch (error) {
      console.error('Calculate results error:', error);
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  // Reset calculation state when round changes
  useEffect(() => {
    if (currentRound?.round_number !== lastCalculatedRound) {
      setResultsCalculated(false);
      setResults(null);
      setLoading(true);
      setNextRoundAttempted(false); // Reset next round attempt flag
    }
  }, [currentRound?.round_number, lastCalculatedRound]);

  // Calculate results when component mounts or round changes
  useEffect(() => {
    if (userId && !resultsCalculated && !calculating && currentRound?.round_number) {
      calculateResults();
    }
  }, [userId, resultsCalculated, calculating, currentRound?.round_number]);

  // Timer logic
  useEffect(() => {
    if (!phaseStartTime) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(phaseStartTime).getTime();
    const duration = getPhaseTimeLimit('results') * 1000; // Get from gameLogic
    const endTime = startTime + duration;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);

      // Only auto-progress when timer expires
      if (remaining === 0) {
        handleNextPhase();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phaseStartTime]);

  // Function to handle phase transition
  const handleNextPhase = async () => {
    // Prevent multiple attempts
    if (nextRoundAttempted) {
      console.log('[ResultsPhase] Next round already attempted, skipping');
      return;
    }

    // If this is the last round, finish the game
    if (currentRound?.round_number >= 5) {
      return;
    }

    setNextRoundAttempted(true);
    
    try {
      const port = window.location.port;
      const baseUrl = port ? `http://localhost:${port}` : window.location.origin;
      
      console.log('[ResultsPhase] Attempting to start next round');
      const response = await fetch(`${baseUrl}/api/admin/rooms/${roomCode}/next-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[ResultsPhase] Next round API call successful');
        const result = await response.json();
        console.log('[ResultsPhase] Next round response:', result);
        
        // Force page refresh after successful next round
        setTimeout(() => {
          console.log('[ResultsPhase] Forcing page refresh after next round');
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json();
        console.log('[ResultsPhase] Next round failed:', response.status, errorData);
        
        // If it failed because someone else already started it, that's fine
        if (errorData.error === 'Can only start next round from results phase') {
          console.log('[ResultsPhase] Another client already started next round, refreshing page');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setNextRoundAttempted(false); // Reset for retry
        }
      }
    } catch (error) {
      console.error('Error starting next round:', error);
      setNextRoundAttempted(false); // Reset for retry
    }
  };

  const getCardInfo = (cardType: string) => {
    switch (cardType) {
      case 'passenger':
        return { emoji: '👤', name: '승객', color: 'text-blue-600' };
      case 'follower':
        return { emoji: '👥', name: '추종자', color: 'text-green-600' };
      case 'hijacker':
        return { emoji: '🔫', name: '하이재커', color: 'text-red-600' };
      case 'baby':
        return { emoji: '👶', name: '우는 애기', color: 'text-purple-600' };
      case 'couple':
        return { emoji: '💕', name: '연인', color: 'text-pink-600' };
      case 'single':
        return { emoji: '😢', name: '모태솔로', color: 'text-gray-600' };
      default:
        return { emoji: '❓', name: '알 수 없음', color: 'text-gray-600' };
    }
  };

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-500';
    if (timeRemaining > 10000) return 'text-green-500';
    if (timeRemaining > 5000) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Format time for display
  const formatTime = (ms: number | null) => {
    if (ms === null) return '';
    return `${Math.ceil(ms / 1000)}초`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 계산하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <p className="text-red-600">결과를 불러올 수 없습니다.</p>
          <button
            onClick={calculateResults}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎯 라운드 {currentRound?.round_number} 결과
        </h2>
        <p className="text-gray-600">각 플레이어의 선택과 점수를 확인하세요</p>
      </div>

      {/* 타이머 */}
      {timeRemaining !== null && !results?.gameFinished && (
        <div className="text-center mb-6">
          <div className={`text-4xl font-bold ${getTimerColor()} mb-2`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                timeRemaining > 10000 ? 'bg-green-500' : 
                timeRemaining > 5000 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(timeRemaining / 15000) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            다음 라운드까지: {formatTime(timeRemaining)}
          </p>
        </div>
      )}

      {/* 라운드 결과 */}
      <div className="space-y-4 mb-6">
        {results.roundResults?.map((result: any, index: number) => {
          const cardInfo = getCardInfo(result.cardType);
          
          return (
            <div
              key={result.playerId}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{result.username}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>✈️ {result.airplaneNumber}번 비행기</span>
                    <span className={cardInfo.color}>
                      {cardInfo.emoji} {cardInfo.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${
                  result.finalScore > 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  +{result.finalScore}점
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 게임 완료 여부 */}
      {results.gameFinished ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-2xl font-bold text-green-800 mb-4">🎉 게임 완료!</h3>
          <p className="text-green-700 mb-4">5라운드가 모두 완료되었습니다.</p>
          
          {/* 최종 순위 */}
          <FinalRankings roomCode={roomCode} />
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h3 className="font-semibold text-blue-800 mb-2">
            다음 라운드: {(currentRound?.round_number || 0) + 1}/5
          </h3>
          <p className="text-blue-700">
            {timeRemaining !== null ? 
              `${Math.ceil(timeRemaining / 1000)}초 후 다음 라운드가 시작됩니다.` : 
              '다음 라운드 준비 중...'}
          </p>
        </div>
      )}

      {/* 라운드 분석 */}
      <div className="mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">📊 라운드 분석</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• 각 비행기별 승객 수에 따라 점수가 결정됩니다</p>
          <p>• 하이재커가 있는 비행기에서는 다른 카드들이 무효화됩니다</p>
          <p>• 추종자는 가장 많은 승객이 있는 비행기에서만 점수를 얻습니다</p>
        </div>
      </div>

      {/* 홈으로 돌아가기 (게임 완료 시에만) */}
      {results.gameFinished && (
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
          >
            새 게임 시작하기
          </button>
        </div>
      )}
    </div>
  );
} 