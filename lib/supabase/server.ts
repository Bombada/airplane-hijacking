import { createClient } from '@supabase/supabase-js';

// 서버 사이드 환경변수 (NEXT_PUBLIC_ 접두사 없음)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Server Supabase 환경변수가 설정되지 않았습니다.');
  throw new Error('Missing Supabase environment variables');
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
}); 