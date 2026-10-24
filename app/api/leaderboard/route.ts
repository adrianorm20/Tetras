import { NextResponse } from 'next/server';
import { initDatabase, getTopHighScores, getTopAccountLevels } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();

    const [topScores, topLevels] = await Promise.all([
      getTopHighScores(10),
      getTopAccountLevels(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        topScores,
        topLevels,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching leaderboard data:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
