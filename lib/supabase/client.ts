import { createClient } from '@supabase/supabase-js';

// 환경변수 디버깅
console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

// 테스트용 환경변수 (실제 프로젝트에서는 .env.local에 설정)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 연결 테스트
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase 연결 오류:', error);
  } else {
    console.log('✅ Supabase 연결 성공');
  }
}); 