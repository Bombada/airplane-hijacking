# 빠른 배포 가이드 - Cloudflare Pages

## 🚀 5분 만에 배포하기

### 1. GitHub에 코드 푸시
```bash
git add .
git commit -m "Ready for Cloudflare deployment"
git push origin main
```

### 2. Cloudflare Pages 설정

1. **[Cloudflare Dashboard](https://dash.cloudflare.com) 접속**
2. **Workers & Pages → Create application → Pages**
3. **Connect to Git → GitHub 저장소 선택**
4. **빌드 설정:**
   - Framework preset: **Next.js**
   - Build command: **`npm run build:cloudflare`**
   - Build output directory: **`.vercel/output/static`**
   - Node.js version: **18.x**

### 3. 환경 변수 설정

**Settings → Environment variables → Production**에서 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NODE_ENV=production
```

### 4. 배포 시작

**Save and Deploy** 클릭 → 3-5분 대기

---

## ✅ 배포 완료 후 확인사항

1. **빌드 성공 확인**: Dashboard에서 빌드 로그 확인
2. **사이트 접속**: 제공된 URL로 접속 테스트
3. **게임 기능 테스트**: 룸 생성 및 플레이어 참여 테스트

---

## 🔧 문제 해결

### 빌드 실패 시
- 환경 변수 설정 확인
- Supabase URL과 키 재확인
- 빌드 로그에서 에러 메시지 확인

### WebSocket 오류 시
현재는 로컬 WebSocket 서버 필요. 배포 후 일부 실시간 기능이 작동하지 않을 수 있음.

**해결**: `DEPLOYMENT.md`의 WebSocket Workers 섹션 참조

---

## 📱 접속 URL

배포 완료 후 다음과 같은 URL을 받게 됩니다:
- **기본 URL**: `https://airplane-hijacking-xxx.pages.dev`
- **사용자 정의 도메인**: 추후 설정 가능

---

**전체 가이드**: `DEPLOYMENT.md` 참조 