/**
 * 6자리 랜덤 룸 코드 생성
 * 대문자와 숫자로 구성 (O, 0, I, 1 제외하여 혼동 방지)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 룸 코드 유효성 검사
 */
export function validateRoomCode(roomCode: string): boolean {
  const pattern = /^[A-Z0-9]{6}$/;
  return pattern.test(roomCode);
} 