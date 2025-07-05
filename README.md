This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase Realtime 테스트

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key 복사
3. `.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 데이터베이스 테이블 생성

Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- game_rooms 테이블 생성
CREATE TABLE game_rooms (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- players 테이블 생성
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES game_rooms(room_code),
  player_name VARCHAR(50) NOT NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
```

### 3. 테스트 실행

1. 개발 서버 실행: `npm run dev`
2. [http://localhost:3000/test-realtime](http://localhost:3000/test-realtime) 접속
3. 브라우저 개발자 도구 Console 탭 열기
4. 다른 탭에서 Supabase Dashboard로 이동
5. Table Editor에서 데이터 추가/수정/삭제
6. 실시간으로 변경사항이 반영되는지 확인

### 4. 테스트 예시

Supabase Table Editor에서:
```sql
INSERT INTO game_rooms (room_code, status) VALUES ('test-room-123', 'waiting');
INSERT INTO players (room_code, player_name, is_ready) VALUES ('test-room-123', '테스트유저', true);
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
