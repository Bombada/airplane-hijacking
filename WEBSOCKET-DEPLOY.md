# WebSocket Server 배포 가이드 (Railway)

이 가이드는 비행기 하이재킹 게임의 WebSocket 서버를 Railway에 배포하는 방법을 설명합니다.

## 1. Railway 계정 생성

1. [Railway.app](https://railway.app)에 접속
2. GitHub 계정으로 로그인
3. 새 프로젝트 생성

## 2. WebSocket 서버 배포

### 방법 1: GitHub 저장소 연결

1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 이 저장소를 선택하고 `server` 폴더를 지정
4. 배포가 완료되면 자동으로 URL이 생성됩니다

### 방법 2: CLI를 사용한 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# server 디렉토리로 이동
cd server

# 새 프로젝트 생성 및 배포
railway init
railway up
```

## 3. 환경 변수 설정

Railway 대시보드에서 다음 환경 변수를 설정하세요:

- `NODE_ENV`: `production`
- `PORT`: `8080` (기본값, Railway가 자동으로 할당)

## 4. 배포 후 설정

### 4.1 WebSocket URL 확인

배포가 완료되면 Railway에서 다음과 같은 URL을 제공합니다:
- `https://your-service-name.up.railway.app`
- WebSocket 연결을 위해서는 `wss://your-service-name.up.railway.app`를 사용

### 4.2 Next.js 애플리케이션 환경 변수 설정

Cloudflare Pages에서 다음 환경 변수를 설정하세요:

```env
NEXT_PUBLIC_WS_URL=wss://your-service-name.up.railway.app
WS_URL=wss://your-service-name.up.railway.app
```

### 4.3 코드 업데이트

`lib/hooks/useWebSocket.ts` 파일에서 하드코딩된 Railway URL을 실제 배포된 URL로 업데이트하세요:

```typescript
// 현재 코드
wsUrl = 'wss://airplane-hijacking-websocket-production.up.railway.app';

// 실제 배포된 URL로 변경
wsUrl = 'wss://your-actual-railway-domain.up.railway.app';
```

## 5. 테스트

### 5.1 WebSocket 서버 상태 확인

```bash
curl https://your-service-name.up.railway.app/health
```

응답 예시:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-09T10:00:00.000Z",
  "connections": []
}
```

### 5.2 WebSocket 연결 테스트

브라우저 개발자 도구에서 WebSocket 연결을 테스트할 수 있습니다:

```javascript
const ws = new WebSocket('wss://your-service-name.up.railway.app');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.send(JSON.stringify({ type: 'join_room', roomCode: 'TEST', userId: 'test' }));
```

## 6. 모니터링

Railway 대시보드에서 다음을 모니터링할 수 있습니다:

- 서버 상태 및 로그
- 메모리 및 CPU 사용량
- 네트워크 트래픽
- 배포 히스토리

## 7. 문제 해결

### 연결 문제

1. Railway 서비스 상태 확인
2. 환경 변수 설정 확인
3. WebSocket URL 형식 확인 (wss://)
4. 방화벽 설정 확인

### 로그 확인

```bash
railway logs
```

## 8. 비용 및 제한

Railway 무료 플랜 제한:
- 실행 시간: 매월 500시간
- 메모리: 512MB
- 네트워크: 100GB
- 최대 3개 프로젝트

프로덕션 환경에서는 유료 플랜을 고려하세요.

## 9. 백업 및 복원

Railway는 자동으로 GitHub와 연동되므로 코드 변경 사항이 자동으로 배포됩니다. 별도의 백업 설정이 필요하지 않습니다.

## 10. 업데이트

코드를 GitHub에 푸시하면 Railway에서 자동으로 재배포됩니다:

```bash
git add .
git commit -m "Update WebSocket server"
git push origin main
```

---

이제 WebSocket 서버가 Railway에 배포되고 Cloudflare Pages의 Next.js 애플리케이션과 연동됩니다! 