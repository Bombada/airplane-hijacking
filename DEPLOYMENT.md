# Cloudflare Pages & Workers 배포 가이드

이 가이드는 Airplane Hijacking 게임을 Cloudflare Pages와 Workers에 배포하는 방법을 설명합니다.

## 준비사항

1. **Cloudflare 계정** - cloudflare.com에서 계정 생성
2. **GitHub 저장소** - 코드가 GitHub에 푸시되어 있어야 함
3. **Supabase 프로젝트** - 데이터베이스 설정 완료

## ⚠️ Windows 사용자 주의사항

Windows 환경에서는 `@cloudflare/next-on-pages`가 정상적으로 작동하지 않을 수 있습니다. 이는 Vercel CLI가 Windows에서 안정적으로 작동하지 않기 때문입니다. 

**해결방법**: Cloudflare Pages에서 자동 빌드를 사용하세요. Cloudflare Pages는 Linux 환경에서 빌드되므로 문제없이 작동합니다.

## 1단계: 의존성 설치

```bash
npm install @cloudflare/next-on-pages@latest wrangler@latest
```

## 2단계: Next.js 앱 배포 (Cloudflare Pages)

### 2.1 Cloudflare Pages 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에서 "Workers & Pages" 메뉴로 이동
2. "Create application" → "Pages" 선택
3. "Connect to Git" 선택
4. GitHub 저장소 선택 및 연결
5. 빌드 설정:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/` (루트)
   - **Node.js version**: `18.x` 또는 `20.x`

### 2.2 환경 변수 설정

Cloudflare Pages의 "Settings" → "Environment variables"에서 다음 변수들을 설정:

**Production 환경:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

**Preview 환경 (선택사항):**
동일한 환경 변수를 설정하거나 개발용 Supabase 프로젝트 사용

### 2.3 배포 실행

설정 완료 후 "Save and Deploy" 클릭

## 3단계: WebSocket 서버 배포 (Cloudflare Workers) - 선택사항

현재 프로젝트는 Node.js WebSocket 서버를 사용하고 있습니다. Cloudflare에서 완전히 실행하려면 WebSocket 서버를 Cloudflare Workers로 마이그레이션해야 합니다.

### 3.1 Workers 디렉토리로 이동
```bash
cd workers
```

### 3.2 Wrangler 로그인
```bash
npx wrangler login
```

### 3.3 WebSocket Worker 배포
```bash
npx wrangler deploy websocket.js
```

### 3.4 클라이언트 코드 업데이트

WebSocket Worker를 배포한 후, 클라이언트에서 WebSocket 연결 URL을 업데이트해야 합니다:

```typescript
// lib/hooks/useWebSocket.ts에서
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
const ws = new WebSocket(`${wsUrl}?room=${roomCode}`);
```

환경 변수에 WebSocket Worker URL 추가:
```
NEXT_PUBLIC_WS_URL=wss://airplane-hijacking-websocket.your-subdomain.workers.dev
```

## 4단계: 배포 확인 및 테스트

### 4.1 배포 상태 확인

1. Cloudflare Pages Dashboard에서 배포 상태 확인
2. 빌드 로그에서 에러가 없는지 확인
3. 배포 완료 후 제공된 URL로 접속

### 4.2 기능 테스트

1. **게임 룸 생성**: 메인 페이지에서 게임 룸 생성 테스트
2. **플레이어 참여**: 다른 브라우저/기기에서 게임 룸 참여 테스트
3. **실시간 동기화**: WebSocket 연결 및 실시간 업데이트 테스트
4. **관리자 기능**: 관리자 페이지에서 게임 제어 테스트

## 5단계: 사용자 정의 도메인 설정 (선택사항)

### 5.1 도메인 연결

1. Cloudflare Pages Dashboard에서 "Custom domains" 탭 선택
2. "Set up a custom domain" 클릭
3. 도메인 입력 (예: game.yourdomain.com)
4. DNS 레코드 자동 설정 또는 수동 설정

### 5.2 SSL 인증서

Cloudflare에서 자동으로 SSL 인증서를 발급하고 관리합니다.

## 트러블슈팅

### 빌드 에러

**문제**: Next.js 빌드 실패
**해결**: 
- 환경 변수 확인
- TypeScript 에러 확인
- 의존성 버전 확인

**문제**: @cloudflare/next-on-pages 에러
**해결**: 
- Node.js 버전 확인 (18.x 이상)
- 빌드 명령어를 `npm run build:cloudflare`로 설정

### 런타임 에러

**문제**: API 호출 실패
**해결**: 
- 환경 변수 설정 확인
- Supabase 연결 상태 확인
- CORS 설정 확인

**문제**: WebSocket 연결 실패
**해결**: 
- WebSocket 서버 상태 확인
- 환경 변수 `NEXT_PUBLIC_WS_URL` 확인
- 브라우저 개발자 도구에서 네트워크 탭 확인

### 로그 확인

```bash
# Pages 빌드 로그 확인
Cloudflare Dashboard → Workers & Pages → 프로젝트 선택 → 빌드 탭

# Workers 로그 확인 (WebSocket 서버 배포 시)
npx wrangler tail airplane-hijacking-websocket
```

## 성능 최적화

### 1. 캐싱 설정
- Cloudflare의 자동 캐싱 활용
- 정적 자산 캐싱 최적화
- API 응답 캐싱 설정

### 2. 이미지 최적화
- Cloudflare Images 서비스 활용 (선택사항)
- WebP 형식 사용
- 적절한 이미지 크기 설정

### 3. 보안 설정
- WAF 규칙 설정
- Rate limiting 설정
- Security headers 설정

## 비용 정보

### Cloudflare Pages
- **무료 티어**: 월 500회 빌드, 무제한 대역폭
- **유료 플랜**: $20/월 (5,000회 빌드, 고급 기능)

### Cloudflare Workers (WebSocket 서버 사용시)
- **무료 티어**: 일 100,000회 요청
- **유료 플랜**: $5/월 (10M 요청)

### Durable Objects (WebSocket 서버 사용시)
- 사용량 기반 과금
- 대부분의 소규모 게임에서는 무료 한도 내 사용 가능

## 추가 리소스

- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare 가이드](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [@cloudflare/next-on-pages 문서](https://github.com/cloudflare/next-on-pages) 