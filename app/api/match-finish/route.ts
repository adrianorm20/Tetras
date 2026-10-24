import { NextResponse } from 'next/server';
import { initDatabase, updatePlayerMatchProgress } from '@/lib/db';

interface MatchResultPayload {
  username?: string;
  score: number;
  lines: number;
  won?: boolean;
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body: MatchResultPayload = await request.json();
    const username = (body.username || 'Adriano').trim();
    const score = Math.max(0, parseInt(String(body.score), 10) || 0);
    const lines = Math.max(0, parseInt(String(body.lines), 10) || 0);
    const won = !!body.won;

    // Cálculo do XP:
    // 1 XP a cada 50 pontos de score + 10 XP por linha limpa + bônus de vitória (100 XP)
    const earnedXp = Math.floor(score / 50) + lines * 10 + (won ? 100 : 25);

    const result = await updatePlayerMatchProgress({
      username,
      score,
      earnedXp,
      won,
    });

    return NextResponse.json({
      success: true,
      earnedXp,
      didLevelUp: result.didLevelUp,
      isNewHighScore: result.isNewHighScore,
      player: result.player,
      progress: result.progress,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving match result:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
