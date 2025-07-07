export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

// GET /api/admin/phase-settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('phase_settings')
      .select('*')
      .order('phase');

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching phase settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phase settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/phase-settings
export async function POST(request: Request) {
  try {
    const { settings } = await request.json();

    // Update each phase setting
    for (const setting of settings) {
      const { error } = await supabase
        .from('phase_settings')
        .update({ duration_seconds: setting.duration_seconds })
        .eq('phase', setting.phase);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating phase settings:', error);
    return NextResponse.json(
      { error: 'Failed to update phase settings' },
      { status: 500 }
    );
  }
} 