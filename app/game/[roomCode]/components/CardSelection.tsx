'use client';

interface Card {
  id: string;
  card_type: 'passenger' | 'follower' | 'hijacker';
}

interface Player {
  id: string;
  user_id: string;
  username: string;
}

interface PlayerAction {
  id: string;
  player_id: string;
  action_type: string;
  selected_card_id?: string;
}

interface CardSelectionProps {
  cards: Card[];
  players: Player[];
  allPlayerActions: PlayerAction[];
  onSelectCard: (cardId: string) => void;
  selectedCard?: string;
  currentUserId: string;
}

export default function CardSelection({ 
  cards, 
  players,
  allPlayerActions,
  onSelectCard, 
  selectedCard,
  currentUserId
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

  // Get players who haven't selected cards yet
  const getPlayersNotSelectedCard = () => {
    const playersWithCardActions = allPlayerActions
      .filter(action => action.action_type === 'select_card')
      .map(action => action.player_id);
    
    return players.filter(player => !playersWithCardActions.includes(player.id));
  };

  const playersNotSelectedCard = getPlayersNotSelectedCard();

  const groupedCards = cards.reduce((acc, card) => {
    if (!acc[card.card_type]) {
      acc[card.card_type] = [];
    }
    acc[card.card_type].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">카드 선택</h2>
        <p className="text-gray-600">사용할 카드를 선택하세요</p>
      </div>

      {/* 아직 카드를 선택하지 않은 플레이어들 표시 */}
      {playersNotSelectedCard.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h3 className="font-semibold text-orange-800 mb-2">
            ⏳ 아직 카드를 선택하지 않은 플레이어 ({playersNotSelectedCard.length}명)
          </h3>
          <div className="flex flex-wrap gap-2">
            {playersNotSelectedCard.map(player => (
              <span
                key={player.id}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  player.user_id === currentUserId
                    ? 'bg-orange-200 text-orange-900 border border-orange-300'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {player.username}
                {player.user_id === currentUserId && ' (나)'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {Object.entries(groupedCards).map(([cardType, typeCards]) => {
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
            카드를 선택했습니다! 다른 플레이어들이 선택할 때까지 기다려주세요.
          </p>
        </div>
      )}

      {!selectedCard && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-800 font-medium">
            카드를 선택해주세요. 선택한 카드는 사용되어 다음 라운드에서 사용할 수 없습니다.
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