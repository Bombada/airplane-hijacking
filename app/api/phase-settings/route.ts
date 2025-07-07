export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phase = searchParams.get('phase');
  if (!phase) {
    return NextResponse.json({ error: 'phase parameter required' }, { status: 400 });
  }
  try {
    const { data, error } = await supabase
      .from('phase_settings')
      .select('duration_seconds')
      .eq('phase', phase)
      .single();
    if (error || !data) {
      return NextResponse.json({ duration: null });
    }
    return NextResponse.json({ duration: data.duration_seconds });
  } catch (e) {
    return NextResponse.json({ duration: null });
  }
} 