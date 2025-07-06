'use client';

interface Card {
  id: string;
  card_type: 'passenger' | 'follower' | 'hijacker';
}

interface CardSelectionProps {
  cards: Card[];
  onSelectCard: (cardId: string) => void;
  selectedCard?: string;
}

export default function CardSelection({ 
  cards, 
  onSelectCard, 
  selectedCard
}: CardSelectionProps) {
  
  const getCardInfo = (type: string) => {
    switch (type) {
      case 'passenger':
        return {
          emoji: '👤',
          name: '승객',
          color: 'bg-blue-500',
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50',
          description: '해당 비행기의 승객 수만큼 점수'
        };
      case 'follower':
        return {
          emoji: '👥',
          name: '추종자',
          color: 'bg-green-500',
          borderColor: 'border-green-500',
          bgColor: 'bg-green-50',
          description: '가장 많은 승객이 있는 비행기에서만 점수'
        };
      case 'hijacker':
        return {
          emoji: '🔫',
          name: '하이재커',
          color: 'bg-red-500',
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50',
          description: '다른 모든 카드를 무효화하고 독점 점수'
        };
      default:
        return {
          emoji: '❓',
          name: '알 수 없음',
          color: 'bg-gray-500',
          borderColor: 'border-gray-500',
          bgColor: 'bg-gray-50',
          description: ''
        };
    }
  };

  // Only track current user's card selection - no need to sync other players' selections
  const hasSelectedCard = !!selectedCard;

  // Fixed order for card types to prevent reordering
  const cardTypeOrder = ['passenger', 'follower', 'hijacker'] as const;
  
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">카드 선택</h2>
        <p className="text-gray-600">사용할 카드를 선택하세요</p>
      </div>

      {/* 현재 사용자의 카드 선택 상태만 표시 */}
      {!hasSelectedCard && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h3 className="font-semibold text-blue-800 mb-2">
            🎯 카드를 선택해주세요
          </h3>
          <p className="text-blue-700 text-sm">
            원하는 카드를 클릭하여 선택하세요. 선택 후에도 변경할 수 있습니다.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {cardTypeOrder.map(cardType => {
          const typeCards = groupedCards[cardType];
          if (!typeCards || typeCards.length === 0) return null;
          
          const cardInfo = getCardInfo(cardType);
          
          return (
            <div key={cardType} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 text-center">
                {cardInfo.emoji} {cardInfo.name}
              </h3>
              
              <div className="space-y-2">
                {typeCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => onSelectCard(card.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      selectedCard === card.id
                        ? `${cardInfo.borderColor} ${cardInfo.bgColor} shadow-lg`
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">
                        {cardInfo.emoji}
                      </div>
                      <div className="font-medium text-gray-800">
                        {cardInfo.name}
                      </div>
                      {selectedCard === card.id && (
                        <div className="mt-2 text-green-600 font-medium">
                          ✓ 선택됨
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="text-xs text-gray-600 text-center p-2 bg-gray-50 rounded">
                {cardInfo.description}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-green-800 font-medium">
            ✅ 카드를 선택했습니다! 다른 카드를 선택하여 변경할 수도 있습니다.
          </p>
          <p className="text-green-700 text-sm mt-1">
            다른 플레이어들이 선택할 때까지 기다려주세요.
          </p>
        </div>
      )}

      {!selectedCard && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800 font-medium">
            ⚠️ 카드를 선택해주세요. 카드는 라운드가 끝날 때까지 보이며, 라운드 종료 후 사용됩니다.
          </p>
        </div>
      )}

      {/* 카드 설명 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">🃏 카드 설명</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">👤</span>
            <div>
              <span className="font-medium text-blue-700">승객:</span>
              <span className="text-gray-600 ml-1">해당 비행기에 있는 승객 카드 수만큼 점수를 얻습니다.</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-500">👥</span>
            <div>
              <span className="font-medium text-green-700">추종자:</span>
              <span className="text-gray-600 ml-1">가장 많은 승객이 있는 비행기와 같은 비행기에 있어야 점수를 얻습니다.</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500">🔫</span>
            <div>
              <span className="font-medium text-red-700">하이재커:</span>
              <span className="text-gray-600 ml-1">해당 비행기의 다른 모든 카드를 무효화하고 혼자 점수를 독점합니다.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 