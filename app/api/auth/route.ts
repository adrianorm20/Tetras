import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase, getLevelFromXp, PlayerProfile } from '@/lib/db';
import { hashPassword, comparePassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const action = body.action; // 'login' | 'register'
    const username = (body.username || '').trim();
    const password = body.password || '';
    const email = body.email ? body.email.trim() : null;

    if (!username || username.length < 3) {
      return NextResponse.json({ success: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ success: false, error: 'A senha deve ter pelo menos 4 caracteres.' }, { status: 400 });
    }

    if (action === 'register') {
      // Verifica se usuário já existe
      const existing = await sql`
        SELECT id FROM players WHERE LOWER(username) = LOWER(${username}) LIMIT 1;
      `;
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Este nome de usuário já está em uso.' }, { status: 409 });
      }

      const hashedPassword = await hashPassword(password);
      const userEmail = email || `${username.toLowerCase()}@tetrio.local`;

      const insertResult = await sql`
        INSERT INTO players (username, email, password_hash, xp, level, matches_played, wins, high_score)
        VALUES (${username}, ${userEmail}, ${hashedPassword}, 0, 1, 0, 0, 0)
        RETURNING id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at;
      `;

      const user = insertResult[0] as unknown as PlayerProfile;
      const progress = getLevelFromXp(user.xp);
      const token = await createSessionToken({
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        high_score: user.high_score,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Conta criada com sucesso!',
        player: user,
        progress,
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 dias
      });

      return response;
    }

    if (action === 'login') {
      const rows = await sql`
        SELECT id, username, email, password_hash, xp, level, matches_played, wins, high_score, created_at, updated_at
        FROM players 
        WHERE LOWER(username) = LOWER(${username})
        LIMIT 1;
      `;

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
      }

      const userRow = rows[0] as {
        id: number;
        username: string;
        email: string | null;
        password_hash: string | null;
        xp: number;
        level: number;
        matches_played: number;
        wins: number;
        high_score: number;
        created_at: string;
        updated_at: string;
      };

      // Se o usuário existir sem senha definida (contas migradas ou de seed), atualiza a senha no primeiro login
      if (!userRow.password_hash) {
        const newHash = await hashPassword(password);
        await sql`
          UPDATE players SET password_hash = ${newHash} WHERE id = ${userRow.id};
        `;
      } else {
        const isMatch = await comparePassword(password, userRow.password_hash);
        if (!isMatch) {
          return NextResponse.json({ success: false, error: 'Senha incorreta.' }, { status: 401 });
        }
      }

      const user: PlayerProfile = {
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        xp: userRow.xp,
        level: userRow.level,
        matches_played: userRow.matches_played,
        wins: userRow.wins,
        high_score: userRow.high_score,
        created_at: userRow.created_at,
        updated_at: userRow.updated_at,
      };

      const progress = getLevelFromXp(user.xp);
      const token = await createSessionToken({
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        high_score: user.high_score,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Login realizado com sucesso!',
        player: user,
        progress,
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Ação inválida.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[API Auth] Erro:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro interno de autenticação.' }, { status: 500 });
  }
}
