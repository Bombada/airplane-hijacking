import { createClient } from '@supabase/supabase-js';

// 서버 사이드 환경변수 (NEXT_PUBLIC_ 접두사 없음)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Server Environment variables:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Server Supabase 환경변수가 설정되지 않았습니다.');
  throw new Error('Missing Supabase environment variables');
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// 서버 연결 테스트
console.log('✅ Server Supabase 클라이언트 생성 완료'); 