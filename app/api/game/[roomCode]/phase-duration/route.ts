import { NextResponse } from 'next/server';
import { getPhaseTimeLimit } from '@/lib/game/gameLogic';

export async function GET(
  request: Request,
  { params }: { params: { roomCode: string } }
) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const phase = searchParams.get('phase');

    if (!phase) {
      return NextResponse.json(
        { error: 'Phase parameter is required' },
        { status: 400 }
      );
    }

    const duration = getPhaseTimeLimit(phase);
    return NextResponse.json({ duration });
  } catch (error) {
    console.error('Error fetching phase duration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phase duration' },
      { status: 500 }
    );
  }
} 