#!/bin/bash

# 비행기 하이재킹 게임 배포 스크립트
# WebSocket 서버와 Next.js 애플리케이션을 배포합니다

set -e

echo "🚀 비행기 하이재킹 게임 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수 정의
print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 의존성 확인
print_step "의존성 확인 중..."

if ! command -v npm &> /dev/null; then
    print_error "npm이 설치되지 않았습니다."
    exit 1
fi

if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI가 설치되지 않았습니다. 설치 중..."
    npm install -g @railway/cli
fi

# 2. WebSocket 서버 배포 (Railway)
print_step "WebSocket 서버 배포 중..."

cd server

# Railway 프로젝트 초기화 (이미 존재하면 스킵)
if [ ! -f "railway.json" ]; then
    print_warning "Railway 프로젝트가 초기화되지 않았습니다."
    echo "수동으로 Railway 대시보드에서 프로젝트를 생성하고 GitHub와 연결하세요."
    echo "또는 다음 명령을 실행하세요:"
    echo "  railway login"
    echo "  railway init"
    echo "  railway up"
    echo ""
    echo "WebSocket 서버 배포 URL을 기록해두세요!"
    read -p "WebSocket 서버 배포가 완료되었습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "WebSocket 서버 배포를 완료한 후 다시 실행하세요."
        exit 1
    fi
else
    print_step "Railway 프로젝트 업데이트 중..."
    railway up
fi

cd ..

# 3. WebSocket URL 업데이트 확인
print_step "WebSocket URL 확인 중..."

print_warning "WebSocket 서버 배포 후 다음 파일들을 업데이트해야 합니다:"
echo "1. lib/hooks/useWebSocket.ts - 하드코딩된 Railway URL 업데이트"
echo "2. app/api/admin/rooms/[roomCode]/phase/route.ts - 하드코딩된 Railway URL 업데이트"
echo "3. Cloudflare Pages 환경 변수 설정"
echo ""

read -p "WebSocket URL이 업데이트되었습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "WebSocket URL을 업데이트한 후 다시 실행하세요."
    exit 1
fi

# 4. Next.js 애플리케이션 빌드
print_step "Next.js 애플리케이션 빌드 중..."

npm run build:cloudflare

# 5. Cloudflare Pages 배포
print_step "Cloudflare Pages 배포 중..."

npm run pages:deploy

# 6. 배포 완료
print_step "배포 완료! 🎉"

echo ""
echo "✅ 배포가 성공적으로 완료되었습니다!"
echo ""
echo "📋 배포 후 확인사항:"
echo "1. WebSocket 서버 상태 확인: https://your-railway-url.up.railway.app/health"
echo "2. Next.js 애플리케이션 확인: https://your-pages-url.pages.dev"
echo "3. 게임 기능 테스트 (방 생성, 참가, admin 기능)"
echo ""
echo "🔧 문제 발생 시:"
echo "1. Railway 대시보드에서 WebSocket 서버 로그 확인"
echo "2. Cloudflare Pages 대시보드에서 배포 로그 확인"
echo "3. 브라우저 개발자 도구에서 WebSocket 연결 상태 확인"
echo ""
echo "📚 자세한 가이드: WEBSOCKET-DEPLOY.md" 