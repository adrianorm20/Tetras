import { NextResponse } from 'next/server';
import { sql, initDatabase, getLevelFromXp, PlayerProfile } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || 'Adriano';

    const rows = await sql`
      SELECT * FROM players WHERE username = ${username} LIMIT 1;
    `;

    if (rows.length === 0) {
      // Cria jogador se não existir
      const inserted = await sql`
        INSERT INTO players (username, email, xp, level, matches_played, wins, high_score)
        VALUES (${username}, ${`${username.toLowerCase()}@tetrio.local`}, 0, 1, 0, 0, 0)
        RETURNING *;
      `;
      const player = inserted[0] as PlayerProfile;
      const progress = getLevelFromXp(player.xp);
      return NextResponse.json({ success: true, player, progress });
    }

    const player = rows[0] as PlayerProfile;
    const progress = getLevelFromXp(player.xp);
    return NextResponse.json({ success: true, player, progress });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching player profile:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
