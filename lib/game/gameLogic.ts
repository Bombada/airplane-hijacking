import { CardType } from '@/types/database';

/**
 * 플레이어에게 카드 배분 (게임 시작시 6장씩)
 */
export function generatePlayerCards(): CardType[] {
  const cards: CardType[] = [];
  
  // 승객 카드 4장, 추종자 카드 1장, 하이재커 카드 1장
  for (let i = 0; i < 4; i++) {
    cards.push('passenger');
  }
  cards.push('follower');
  cards.push('hijacker');
  
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
 * 라운드 점수 계산
 * @param airplanePassengers 각 비행기별 승객 수
 * @param playerAirplane 플레이어가 선택한 비행기 번호
 * @param playerCard 플레이어가 사용한 카드 타입
 */
export function calculateRoundScore(
  airplanePassengers: Record<number, number>,
  playerAirplane: number,
  playerCard: CardType
): number {
  const passengersOnAirplane = airplanePassengers[playerAirplane] || 0;
  
  switch (playerCard) {
    case 'passenger':
      // 승객: 해당 비행기의 승객 수만큼 점수
      return passengersOnAirplane;
    
    case 'follower':
      // 추종자: 가장 많은 승객이 있는 비행기와 같은 비행기면 점수, 아니면 0점
      const maxPassengers = Math.max(...Object.values(airplanePassengers));
      return passengersOnAirplane === maxPassengers ? maxPassengers : 0;
    
    case 'hijacker':
      // 하이재커: 해당 비행기에 승객이 있으면 모든 승객이 0점이 되고, 하이재커만 점수
      return passengersOnAirplane > 0 ? passengersOnAirplane : 0;
    
    default:
      return 0;
  }
}
/**
 * 비행기 번호에 따라 최대 탑승 인원 반환
 */
export function getAirplaneMaxPassengers(airplaneNumber: number): number {
  switch (airplaneNumber) {
    case 1:
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 8;
    default:
      return 2; // 예외 처리: 기본값 2명
  }
}
/**
 * 하이재커 효과 적용
 * 하이재커가 있는 비행기의 다른 모든 카드는 0점 처리
 */
export function applyHijackerEffect(
  playerActions: Array<{
    playerId: string;
    airplaneNumber: number;
    cardType: CardType;
    baseScore: number;
  }>
): Array<{
  playerId: string;
  airplaneNumber: number;
  cardType: CardType;
  finalScore: number;
}> {
  // 하이재커가 있는 비행기 찾기
  const hijackedAirplanes = new Set<number>();
  
  playerActions.forEach(action => {
    if (action.cardType === 'hijacker') {
      hijackedAirplanes.add(action.airplaneNumber);
    }
  });
  
  // 최종 점수 계산
  return playerActions.map(action => ({
    playerId: action.playerId,
    airplaneNumber: action.airplaneNumber,
    cardType: action.cardType,
    finalScore: hijackedAirplanes.has(action.airplaneNumber) && action.cardType !== 'hijacker' 
      ? 0 
      : action.baseScore
  }));
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
  const phases = ['waiting', 'airplane_selection', 'discussion', 'card_selection', 'results'];
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
      return 15; // 30초
    case 'discussion':
      return 10; // 30초
    case 'card_selection':
      return 15; // 30초
    case 'results':
      return 30; // 30초로 변경
    default:
      return 0;
  }
} 