import { NextResponse } from 'next/server';
import { sql, initDatabase, getLevelFromXp, PlayerProfile } from '@/lib/db';

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

    // Busca usuário atual ou cria
    let rows = await sql`
      SELECT * FROM players WHERE username = ${username} LIMIT 1;
    `;

    if (rows.length === 0) {
      await sql`
        INSERT INTO players (username, email, xp, level, matches_played, wins, high_score)
        VALUES (${username}, ${`${username.toLowerCase()}@tetrio.local`}, 0, 1, 0, 0, 0)
        ON CONFLICT (username) DO NOTHING;
      `;
      rows = await sql`SELECT * FROM players WHERE username = ${username} LIMIT 1;`;
    }

    const currentPlayer = rows[0] as PlayerProfile;
    const newTotalXp = currentPlayer.xp + earnedXp;
    const newLevelCalc = getLevelFromXp(newTotalXp);
    const isNewHighScore = score > currentPlayer.high_score;
    const updatedHighScore = Math.max(currentPlayer.high_score, score);
    const didLevelUp = newLevelCalc.level > currentPlayer.level;

    const updatedRows = await sql`
      UPDATE players
      SET 
        xp = ${newTotalXp},
        level = ${newLevelCalc.level},
        matches_played = matches_played + 1,
        wins = wins + ${won ? 1 : 0},
        high_score = ${updatedHighScore},
        updated_at = NOW()
      WHERE username = ${username}
      RETURNING *;
    `;

    const updatedPlayer = updatedRows[0] as PlayerProfile;

    return NextResponse.json({
      success: true,
      earnedXp,
      didLevelUp,
      isNewHighScore,
      player: updatedPlayer,
      progress: newLevelCalc,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving match result:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
