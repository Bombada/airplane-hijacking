'use client';

import { useEffect, useState } from 'react';
import AirplanePassengers from './AirplanePassengers';

interface Card {
  id: string;
  card_type: 'passenger' | 'follower' | 'hijacker' | 'baby' | 'couple' | 'single';
}

interface CardSelectionProps {
  cards: Card[];
  onSelectCard: (cardId: string) => void;
  selectedCard: string;
  phaseStartTime: string;
  roomCode: string;
  airplanes: any[];
  players: any[];
  allPlayerActions: any[];
}

export default function CardSelection({ 
  cards, 
  onSelectCard, 
  selectedCard,
  phaseStartTime,
  roomCode,
  airplanes,
  players,
  allPlayerActions
}: CardSelectionProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Timer logic
  useEffect(() => {
    if (!phaseStartTime) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(phaseStartTime).getTime();
    const duration = 40 * 1000; // 15 seconds
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
    try {
      const port = window.location.port;
      const baseUrl = port ? `http://localhost:${port}` : window.location.origin;
      
      const response = await fetch(`${baseUrl}/api/admin/rooms/${roomCode}/phase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phase: 'results'  // Change this from 'discussion' to 'results'
        }),
      });

      if (response.ok) {
        console.log('[CardSelection] Phase changed to results successfully');
        // 페이지 새로고침하여 다음 페이즈로 이동
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.error('Failed to progress to next phase:', response.status);
      }
    } catch (error) {
      console.error('Error progressing to next phase:', error);
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
  const formatTime = (milliseconds: number | null) => {
    if (milliseconds === null) return '';
    const seconds = Math.ceil(milliseconds / 1000);
    return `${seconds}초`;
  };
  
  const getCardInfo = (type: string) => {
    switch (type) {
      case 'passenger':
        return {
          emoji: '👤',
          name: '승객',
          color: 'bg-blue-500',
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50',
          hoverColor: 'hover:bg-blue-100',
          description: '함께 탑승한 승객 수 × 2점을 얻습니다'
        };
      case 'follower':
        return {
          emoji: '👥',
          name: '추종자',
          color: 'bg-green-500',
          borderColor: 'border-green-500',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          description: '탑승한 비행기에 하이재커가 있을 경우 7점을 얻습니다'
        };
      case 'hijacker':
        return {
          emoji: '🔫',
          name: '하이재커',
          color: 'bg-red-500',
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50',
          hoverColor: 'hover:bg-red-100',
          description: '함께 탑승한 승객 수 × 3점, 추종자가 있으면 추종자 수 × 3점 차감'
        };
      case 'baby':
        return {
          emoji: '👶',
          name: '우는 애기',
          color: 'bg-purple-500',
          borderColor: 'border-purple-500',
          bgColor: 'bg-purple-50',
          hoverColor: 'hover:bg-purple-100',
          description: '함께 탑승한 승객 수 × 2점, 다른 승객들은 각각 1점 차감'
        };
      case 'couple':
        return {
          emoji: '💕',
          name: '연인',
          color: 'bg-pink-500',
          borderColor: 'border-pink-500',
          bgColor: 'bg-pink-50',
          hoverColor: 'hover:bg-pink-100',
          description: '함께 탑승한 승객 수 × 2점 + 연인 수 × 1점(본인 제외)'
        };
      case 'single':
        return {
          emoji: '😢',
          name: '모태솔로',
          color: 'bg-gray-500',
          borderColor: 'border-gray-500',
          bgColor: 'bg-gray-50',
          hoverColor: 'hover:bg-gray-100',
          description: '함께 탑승한 승객 수 × 3점, 연인 수 × 1점 차감'
        };
      default:
        return {
          emoji: '❓',
          name: '알 수 없음',
          color: 'bg-gray-500',
          borderColor: 'border-gray-500',
          bgColor: 'bg-gray-50',
          hoverColor: 'hover:bg-gray-100',
          description: ''
        };
    }
  };

  // Only track current user's card selection - no need to sync other players' selections
  const hasSelectedCard = !!selectedCard;

  // Fixed order for card types to prevent reordering
  const cardTypeOrder = ['passenger', 'follower', 'hijacker', 'baby', 'couple', 'single'] as const;
  
  const groupedCards = cards.reduce((acc, card) => {
    if (!acc[card.card_type]) {
      acc[card.card_type] = [];
    }
    acc[card.card_type].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  // Sort each group by card ID to maintain consistent order within each type
  Object.keys(groupedCards).forEach(cardType => {
    groupedCards[cardType].sort((a, b) => a.id.localeCompare(b.id));
  });

  // Get card count for each type
  const getCardCount = (cardType: string) => {
    return groupedCards[cardType]?.length || 0;
  };

  // Get selected card info
  const getSelectedCardInfo = () => {
    if (!selectedCard) return null;
    const card = cards.find(c => c.id === selectedCard);
    return card ? getCardInfo(card.card_type) : null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🃏 카드 선택</h2>
        <p className="text-gray-600">사용할 카드를 선택하세요</p>
      </div>

      {/* 타이머 */}
      {timeRemaining !== null && (
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
            남은 시간: {formatTime(timeRemaining)}
          </p>
        </div>
      )}

      {/* 현재 선택된 카드 표시 */}
      {hasSelectedCard && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <h3 className="font-semibold text-green-800 mb-2">
            ✅ 선택된 카드
          </h3>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">{getSelectedCardInfo()?.emoji}</span>
            <span className="text-green-700 font-medium">{getSelectedCardInfo()?.name}</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            다른 카드를 선택하여 변경할 수 있습니다.
          </p>
        </div>
      )}

      {/* 카드 선택 버튼들 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-6xl mx-auto mb-6">
        {cardTypeOrder.map(cardType => {
          const cardCount = getCardCount(cardType);
          const cardInfo = getCardInfo(cardType);
          const isSelected = selectedCard && cards.find(c => c.id === selectedCard)?.card_type === cardType;
          const hasCards = cardCount > 0;
          
          return (
            <div key={cardType} className="relative">
              <button
                onClick={() => {
                  if (hasCards) {
                    // Find the first available card of this type
                    const firstCard = groupedCards[cardType]?.[0];
                    if (firstCard) {
                      onSelectCard(firstCard.id);
                    }
                  }
                }}
                disabled={!hasCards}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  isSelected
                    ? `${cardInfo.borderColor} ${cardInfo.bgColor} shadow-lg`
                    : hasCards
                    ? `border-gray-300 bg-white ${cardInfo.hoverColor} hover:border-gray-400 hover:shadow-md`
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {cardInfo.emoji}
                  </div>
                  <div className="font-bold text-sm text-gray-800 mb-1">
                    {cardInfo.name}
                  </div>
                  <div className={`text-xs font-medium mb-2 ${
                    hasCards ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    보유: {cardCount}개
                  </div>
                  {isSelected && (
                    <div className="text-green-600 font-bold text-xs">
                      ✓ 선택됨
                    </div>
                  )}
                  {!hasCards && (
                    <div className="text-red-500 font-medium text-xs">
                      ❌ 없음
                    </div>
                  )}
                </div>
              </button>
              
              {/* 카드 설명 */}
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  {cardInfo.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택 안내 메시지 */}
      {!hasSelectedCard && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800 font-medium">
            ⚠️ 카드를 선택해주세요
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            위의 카드 버튼을 클릭하여 사용할 카드를 선택하세요.
          </p>
        </div>
      )}

      {/* 카드 상세 설명 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-3">📋 카드 상세 설명</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">👤</span>
            <div>
              <span className="font-bold text-blue-700">승객 카드:</span>
              <p className="text-gray-700 mt-1">
                함께 탑승한 승객 수 × 2점을 얻습니다. 
                승객이 많을수록 더 많은 점수를 얻을 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">👥</span>
            <div>
              <span className="font-bold text-green-700">추종자 카드:</span>
              <p className="text-gray-700 mt-1">
                탑승한 비행기에 하이재커가 있을 경우 7점을 얻습니다.
                하이재커를 잘 찾아서 함께 탑승하는 것이 중요합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">🔫</span>
            <div>
              <span className="font-bold text-red-700">하이재커 카드:</span>
              <p className="text-gray-700 mt-1">
                함께 탑승한 승객 수 × 3점을 얻습니다. 
                단, 추종자가 있으면 추종자 수 × 3점이 차감됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">👶</span>
            <div>
              <span className="font-bold text-purple-700">우는 애기 카드:</span>
              <p className="text-gray-700 mt-1">
                함께 탑승한 승객 수 × 2점을 얻습니다. 
                단, 다른 승객들은 각각 1점씩 차감됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">💕</span>
            <div>
              <span className="font-bold text-pink-700">연인 카드:</span>
              <p className="text-gray-700 mt-1">
                함께 탑승한 승객 수 × 2점 + 연인 수 × 1점(본인 제외)을 얻습니다.
                다른 연인과 함께 탑승하면 추가 점수를 얻습니다.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <span className="text-2xl">😢</span>
            <div>
              <span className="font-bold text-gray-700">모태솔로 카드:</span>
              <p className="text-gray-700 mt-1">
                함께 탑승한 승객 수 × 3점을 얻습니다. 
                단, 연인이 있으면 연인 수 × 1점이 차감됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AirplanePassengers 
        airplanes={airplanes}
        players={players}
        allPlayerActions={allPlayerActions}
      />
    </div>
  );
} 