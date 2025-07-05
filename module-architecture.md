src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── game/
│   │   └── [roomCode]/
│   │       ├── page.tsx
│   │       └── components/
│   │           ├── GameBoard.tsx
│   │           ├── AirplaneSelection.tsx
│   │           ├── CardSelection.tsx
│   │           ├── DiscussionPhase.tsx
│   │           ├── ResultsPhase.tsx
│   │           └── PlayerList.tsx
│   ├── lobby/
│   │   └── page.tsx
│   ├── api/
│   │   ├── game/
│   │   │   ├── create/route.ts
│   │   │   ├── join/route.ts
│   │   │   ├── start/route.ts
│   │   │   └── [roomCode]/
│   │   │       ├── actions/route.ts
│   │   │       ├── state/route.ts
│   │   │       └── results/route.ts
│   │   └── auth/
│   │       └── route.ts
│   └── globals.css
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── game/
│   │   ├── Timer.tsx
│   │   ├── ScoreBoard.tsx
│   │   └── ChatSystem.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── game/
│   │   ├── gameLogic.ts
│   │   ├── scoreCalculator.ts
│   │   └── phaseManager.ts
│   ├── hooks/
│   │   ├── useGameState.ts
│   │   ├── useRealtime.ts
│   │   └── useTimer.ts
│   └── utils/
│       ├── roomCode.ts
│       └── validation.ts
├── store/
│   ├── gameStore.ts
│   ├── playerStore.ts
│   └── uiStore.ts
└── types/
    ├── game.ts
    ├── player.ts
    └── database.ts