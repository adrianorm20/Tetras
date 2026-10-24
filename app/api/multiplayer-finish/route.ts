import { NextResponse } from 'next/server';
import { initDatabase, updatePlayerMatchProgress } from '@/lib/db';

interface MultiplayerParticipantResult {
  username: string;
  rank: number; // 1 a 8
  score: number;
  lines: number;
  won: boolean;
}

interface MultiplayerMatchFinishPayload {
  roomId: string;
  participants: MultiplayerParticipantResult[];
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body: MultiplayerMatchFinishPayload = await request.json();
    const participants = body.participants || [];

    if (participants.length === 0) {
      return NextResponse.json({ success: false, error: 'No participants provided' }, { status: 400 });
    }

    const updatedParticipants = [];

    for (const p of participants) {
      const username = p.username.trim();
      const score = Math.max(0, parseInt(String(p.score), 10) || 0);
      const lines = Math.max(0, parseInt(String(p.lines), 10) || 0);
      const won = !!p.won || p.rank === 1;

      // Cálculo de XP Multiplayer competitivo:
      // Bônus de colocação: 1º lugar (+250 XP), 2º (+150 XP), 3º (+100 XP), 4º-8º (+50 XP)
      const rankBonus = p.rank === 1 ? 250 : p.rank === 2 ? 150 : p.rank === 3 ? 100 : 50;
      const earnedXp = Math.floor(score / 40) + lines * 15 + rankBonus;

      // Usa operação atômica e tipada para atualizar XP e High Score
      const result = await updatePlayerMatchProgress({
        username,
        score,
        earnedXp,
        won,
      });

      const updated = result.player;

      updatedParticipants.push({
        username: updated.username,
        rank: p.rank,
        earnedXp,
        newLevel: updated.level,
        highScore: updated.high_score,
        totalXp: updated.xp,
        wins: updated.wins,
        matchesPlayed: updated.matches_played,
      });
    }

    return NextResponse.json({
      success: true,
      roomId: body.roomId,
      results: updatedParticipants,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in /api/multiplayer-finish:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
