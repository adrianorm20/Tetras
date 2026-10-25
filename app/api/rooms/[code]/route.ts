import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initDatabase();
    const { code } = await params;
    const cleanCode = (code || '').toUpperCase().trim();

    const rows = await sql`
      SELECT 
        r.id, 
        r.code, 
        r.name, 
        r.host_id, 
        r.is_public, 
        r.max_players, 
        r.status, 
        r.created_at, 
        r.updated_at,
        p.username as host_name,
        COUNT(rp.id)::int as player_count
      FROM rooms r
      LEFT JOIN players p ON r.host_id = p.id
      LEFT JOIN room_players rp ON r.id = rp.room_id
      WHERE UPPER(r.code) = ${cleanCode} OR r.id = ${code}
      GROUP BY r.id, r.code, r.name, r.host_id, r.is_public, r.max_players, r.status, r.created_at, r.updated_at, p.username
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Sala não encontrada com este código.' }, { status: 404 });
    }

    const room = rows[0];

    // Busca jogadores da sala
    const players = await sql`
      SELECT rp.id, rp.player_id, rp.is_ready, rp.is_host, p.username, p.level, p.xp, p.high_score
      FROM room_players rp
      JOIN players p ON rp.player_id = p.id
      WHERE rp.room_id = ${room.id}
      ORDER BY rp.is_host DESC, rp.id ASC;
    `;

    return NextResponse.json({
      success: true,
      room,
      players,
    });
  } catch (err: unknown) {
    console.error('[API Room By Code] Erro:', err);
    return NextResponse.json({ success: false, error: 'Erro ao buscar detalhes da sala' }, { status: 500 });
  }
}

// Fechar ou deletar a sala quando o host sair
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initDatabase();
    const { code } = await params;
    const cleanCode = (code || '').toUpperCase().trim();

    // Remove jogadores associados e marca a sala como finished
    await sql`
      DELETE FROM room_players 
      WHERE room_id IN (SELECT id FROM rooms WHERE UPPER(code) = ${cleanCode} OR id = ${code});
    `;

    await sql`
      UPDATE rooms 
      SET status = 'finished' 
      WHERE UPPER(code) = ${cleanCode} OR id = ${code};
    `;

    return NextResponse.json({ success: true, message: 'Sala encerrada com sucesso.' });
  } catch (err: unknown) {
    console.error('[API Room DELETE] Erro:', err);
    return NextResponse.json({ success: false, error: 'Erro ao encerrar a sala' }, { status: 500 });
  }
}
