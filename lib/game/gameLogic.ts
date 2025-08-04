import { CardType } from '@/types/database';

/**
 * 플레이어에게 카드 배분 (게임 시작시 각 카드 타입을 1~2장씩 배분)
 */
export function generatePlayerCards(): CardType[] {
  const cards: CardType[] = [];
  
  // 각 카드 타입별로 1~2장씩 배분
  cards.push('passenger', 'passenger');  // 승객 2장
  cards.push('follower');               // 추종자 1장
  cards.push('hijacker');               // 하이재커 1장
  cards.push('baby');                   // 우는 애기 1장
  cards.push('couple');                 // 연인 1장
  cards.push('single');                 // 모태솔로 1장
  
  // 카드 섞기
  return shuffleArray(cards);
}

/**
 * 배열 섞기 (Fisher-Yates 알고리즘)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 비행기 번호 생성 (1~4번)
 */
export function generateAirplaneNumbers(): number[] {
  return [1, 2, 3, 4];
}

/**
 * 전체 게임 점수 계산
 * @param playerActions 모든 플레이어의 행동 정보
 */
export function calculateGameScore(
  playerActions: Array<{
    playerId: string;
    username: string;
    airplaneNumber: number;
    cardType: CardType;
  }>
): Array<{
  playerId: string;
  username: string;
  airplaneNumber: number;
  cardType: CardType;
  finalScore: number;
}> {
  // 각 비행기별로 승객 정보 정리
  const airplaneData: Record<number, Array<{
    playerId: string;
    username: string;
    cardType: CardType;
  }>> = {};

  // 비행기별 승객 정보 수집
  playerActions.forEach(action => {
    if (!airplaneData[action.airplaneNumber]) {
      airplaneData[action.airplaneNumber] = [];
    }
    airplaneData[action.airplaneNumber].push({
      playerId: action.playerId,
      username: action.username,
      cardType: action.cardType
    });
  });

  // 각 플레이어의 점수 계산
  const results: Array<{
    playerId: string;
    username: string;
    airplaneNumber: number;
    cardType: CardType;
    finalScore: number;
  }> = [];

  playerActions.forEach(action => {
    const airplanePassengers = airplaneData[action.airplaneNumber];
    const totalPassengers = airplanePassengers.length;
    
    // 카드 타입별 개수 계산
    const cardCounts = {
      passenger: airplanePassengers.filter(p => p.cardType === 'passenger').length,
      follower: airplanePassengers.filter(p => p.cardType === 'follower').length,
      hijacker: airplanePassengers.filter(p => p.cardType === 'hijacker').length,
      baby: airplanePassengers.filter(p => p.cardType === 'baby').length,
      couple: airplanePassengers.filter(p => p.cardType === 'couple').length,
      single: airplanePassengers.filter(p => p.cardType === 'single').length
    };

    // 하이재커가 있는지 확인
    const hasHijacker = cardCounts.hijacker > 0;
    
    // 하이재커가 있으면 승객 수를 0으로 계산, 없으면 본인 제외
    const effectivePassengerCount = hasHijacker ? 0 : (totalPassengers - 1);

    let finalScore = 0;

    // 하이재커가 있으면 추종자 외 다른 승객들은 점수를 0으로 만듦
    if (hasHijacker && action.cardType !== 'hijacker' && action.cardType !== 'follower') {
      finalScore = 0;
    } else {
      switch (action.cardType) {
        case 'passenger':
          // 승객: 함께 탑승한 승객 수 × 2점 (하이재커가 있으면 0점)
          finalScore = effectivePassengerCount * 2;
          break;

        case 'hijacker':
          // 하이재커: 함께 탑승한 승객 수 × 3점, 추종자가 있으면 추종자 수 × 3점 차감
          finalScore = (totalPassengers - 1) * 3 - (cardCounts.follower * 3);
          break;

        case 'follower':
          // 추종자: 탑승한 비행기에 하이재커가 있을 경우 7점
          finalScore = hasHijacker ? 7 : 0;
          break;

        case 'baby':
          // 우는 애기: 함께 탑승한 승객 수 × 2점 (하이재커가 있으면 0점)
          finalScore = effectivePassengerCount * 2;
          break;

        case 'couple':
          // 연인: 기본 점수: 함께 탑승한 승객 수 × 2점, 추가 점수: 연인 수 × 1점 (본인 제외)
          // 하이재커가 있으면 0점
          if (hasHijacker) {
            finalScore = 0;
          } else {
            finalScore = effectivePassengerCount * 2 + (cardCounts.couple - 1) * 1;
          }
          break;

        case 'single':
          // 모태솔로: 기본 점수: 함께 탑승한 승객 수 × 3점, 감점: 연인 수 × 1점
          // 하이재커가 있으면 0점
          if (hasHijacker) {
            finalScore = 0;
          } else {
            finalScore = effectivePassengerCount * 3 - (cardCounts.couple * 1);
          }
          break;

        default:
          finalScore = 0;
      }
    }

    // 우는 애기 효과 적용: 같은 비행기에 우는 애기가 있으면 모든 카드에 -1점 (우는 애기 본인 제외)
    if (cardCounts.baby > 0 && action.cardType !== 'baby') {
      finalScore = Math.max(0, finalScore - cardCounts.baby);
    }

    results.push({
      playerId: action.playerId,
      username: action.username,
      airplaneNumber: action.airplaneNumber,
      cardType: action.cardType,
      finalScore: Math.max(0, finalScore) // 음수 방지
    });
  });

  return results;
}

/**
 * 게임 종료 조건 확인 (5라운드 완료)
 */
export function isGameFinished(currentRound: number): boolean {
  return currentRound >= 5;
}

/**
 * 다음 페이즈 결정
 */
export function getNextPhase(currentPhase: string): string {
  const phases = ['waiting', 'airplane_selection', 'card_selection', 'results'];
  const currentIndex = phases.indexOf(currentPhase);
  
  if (currentIndex === -1 || currentIndex === phases.length - 1) {
    return 'airplane_selection'; // 다음 라운드 시작
  }
  
  return phases[currentIndex + 1];
}

/**
 * 페이즈별 제한 시간 (초)
 */
export function getPhaseTimeLimit(phase: string): number {
  switch (phase) {
    case 'airplane_selection':
      return 15;
    case 'card_selection':
      return 40;
    case 'results':
      return 30;
    default:
      return 0;
  }
} 