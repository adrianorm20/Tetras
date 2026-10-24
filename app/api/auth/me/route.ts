import { NextResponse } from 'next/server';
import { sql, initDatabase, getLevelFromXp, PlayerProfile } from '@/lib/db';
import { getSessionUser, COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  try {
    await initDatabase();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, authenticated: false, player: null });
    }

    const rows = await sql`
      SELECT id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at
      FROM players 
      WHERE id = ${session.id}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ success: false, authenticated: false, player: null });
    }

    const player = rows[0] as unknown as PlayerProfile;
    const progress = getLevelFromXp(player.xp);

    return NextResponse.json({
      success: true,
      authenticated: true,
      player,
      progress,
    });
  } catch (err: unknown) {
    console.error('[API Auth Me] Erro:', err);
    return NextResponse.json({ success: false, authenticated: false, error: 'Erro ao verificar sessão' }, { status: 500 });
  }
}

export async function POST() {
  // Logout
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
