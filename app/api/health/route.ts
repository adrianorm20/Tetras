import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  try {
    const rows = await sql`
      SELECT 
        version(),
        current_database() as database,
        NOW() as current_time;
    `;

    const countRows = await sql`SELECT COUNT(*) as count FROM players;`;
    const totalPlayers = parseInt(String((countRows[0] as { count: string })?.count || '0'), 10);
    const latencyMs = Date.now() - startTime;

    const row = rows[0] as { version: string; database: string };

    return NextResponse.json({
      success: true,
      service: 'Neon Postgres Serverless',
      latencyMs,
      branch: process.env.NEON_BRANCH || 'production',
      database: row.database || 'neondb',
      version: row.version ? row.version.split(' ')[0] + ' ' + row.version.split(' ')[1] : 'PostgreSQL',
      totalScores: totalPlayers,
      pooling: true,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Neon healthcheck failed:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
