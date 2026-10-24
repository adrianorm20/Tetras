import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase, RoomRecord } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Listar salas públicas
export async function GET() {
  try {
    await initDatabase();
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
      WHERE r.is_public = TRUE AND r.status != 'finished'
      GROUP BY r.id, r.code, r.name, r.host_id, r.is_public, r.max_players, r.status, r.created_at, r.updated_at, p.username
      ORDER BY r.created_at DESC
      LIMIT 20;
    `;

    return NextResponse.json({ success: true, rooms: rows });
  } catch (err: unknown) {
    console.error('[API Rooms GET] Erro:', err);
    return NextResponse.json({ success: false, error: 'Falha ao buscar salas' }, { status: 500 });
  }
}

// Criar nova sala
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const session = await getSessionUser();

    const roomName = (body.name || 'Arena Competitiva').trim();
    const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : true;
    const maxPlayers = Math.min(8, Math.max(2, Number(body.max_players) || 8));
    const code = generateRoomCode();
    const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const hostId = session?.id || 1; // Default fallback para player de seed se não logado

    const inserted = await sql`
      INSERT INTO rooms (id, code, name, host_id, is_public, max_players, status)
      VALUES (${roomId}, ${code}, ${roomName}, ${hostId}, ${isPublic}, ${maxPlayers}, 'waiting')
      RETURNING id, code, name, host_id, is_public, max_players, status, created_at, updated_at;
    `;

    // Insere o host como participante inicial
    await sql`
      INSERT INTO room_players (room_id, player_id, is_ready, is_host)
      VALUES (${roomId}, ${hostId}, TRUE, TRUE)
      ON CONFLICT DO NOTHING;
    `;

    const room = inserted[0] as unknown as RoomRecord;

    return NextResponse.json({
      success: true,
      room: {
        ...room,
        player_count: 1,
      },
    });
  } catch (err: unknown) {
    console.error('[API Rooms POST] Erro:', err);
    return NextResponse.json({ success: false, error: 'Falha ao criar sala' }, { status: 500 });
  }
}
