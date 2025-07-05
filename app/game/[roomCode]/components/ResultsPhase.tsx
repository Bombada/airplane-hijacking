'use client';

import { useState, useEffect } from 'react';

interface ResultsPhaseProps {
  roomCode: string;
  userId: string | null;
  currentRound: any;
}

export default function ResultsPhase({ 
  roomCode, 
  userId, 
  currentRound 
}: ResultsPhaseProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const calculateResults = async () => {
    if (!userId || calculating) return;

    setCalculating(true);
    try {
      const response = await fetch(`/api/game/${roomCode}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setResults(result.data);
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

  useEffect(() => {
    // 컴포넌트 마운트 시 결과 계산
    calculateResults();
  }, []);

  const getCardInfo = (cardType: string) => {
    switch (cardType) {
      case 'passenger':
        return { emoji: '👤', name: '승객', color: 'text-blue-600' };
      case 'follower':
        return { emoji: '👥', name: '추종자', color: 'text-green-600' };
      case 'hijacker':
        return { emoji: '🔫', name: '하이재커', color: 'text-red-600' };
      default:
        return { emoji: '❓', name: '알 수 없음', color: 'text-gray-600' };
    }
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
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">최종 순위</h4>
            <div className="space-y-2">
              {results.roundResults
                ?.sort((a: any, b: any) => b.finalScore - a.finalScore)
                .map((result: any, index: number) => (
                  <div
                    key={result.playerId}
                    className={`flex items-center justify-between p-2 rounded ${
                      index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">
                        {index + 1}위 {index === 0 && '🏆'}
                      </span>
                      <span>{result.username}</span>
                    </div>
                    <span className="font-semibold">{result.finalScore}점</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h3 className="font-semibold text-blue-800 mb-2">
            다음 라운드: {results.nextRound}/5
          </h3>
          <p className="text-blue-700">잠시 후 다음 라운드가 시작됩니다...</p>
        </div>
      )}

      {/* 라운드 분석 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
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