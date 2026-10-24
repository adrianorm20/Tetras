import { neon, NeonQueryFunction } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[Neon DB] Warning: DATABASE_URL is not set.');
}

// Client para queries normais (pooled via PgBouncer)
export const sql: NeonQueryFunction<false, false> = DATABASE_URL
  ? neon(DATABASE_URL)
  : (() => {
      throw new Error('DATABASE_URL is not set');
    }) as unknown as NeonQueryFunction<false, false>;

// Client direto para DDL/migrações
export const sqlDirect: NeonQueryFunction<false, false> = DATABASE_URL_UNPOOLED
  ? neon(DATABASE_URL_UNPOOLED)
  : sql;

export interface PlayerProfile {
  id: number;
  username: string;
  email: string | null;
  xp: number;
  level: number;
  matches_played: number;
  wins: number;
  high_score: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fórmula de Progressão de XP:
 * XP necessário para alcançar o nível N = 100 * (N - 1)^1.5 + 100 * (N - 1)
 * Ou seja:
 * Nível 1: 0 XP
 * Nível 2: 200 XP
 * Nível 3: ~500 XP
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5) + 100 * (level - 1));
}

export function getLevelFromXp(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progressPercent: number } {
  let level = 1;
  while (getXpForLevel(level + 1) <= xp) {
    level++;
  }

  const currentLevelBaseXp = getXpForLevel(level);
  const nextLevelBaseXp = getXpForLevel(level + 1);
  const xpInCurrentLevel = xp - currentLevelBaseXp;
  const xpNeededForNext = nextLevelBaseXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForNext) * 100)));

  return {
    level,
    currentLevelXp: xpInCurrentLevel,
    nextLevelXp: xpNeededForNext,
    progressPercent,
  };
}

/**
 * Inicialização / Migração do esquema SQL no Neon
 */
export async function initDatabase() {
  await sqlDirect`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100),
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      matches_played INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      high_score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Cria um usuário padrão para a sessão local caso não exista nenhum
  const existing = await sql`SELECT COUNT(*) as count FROM players WHERE username = 'Adriano';`;
  if (parseInt((existing[0] as { count: string }).count, 10) === 0) {
    await sql`
      INSERT INTO players (username, email, xp, level, matches_played, wins, high_score)
      VALUES ('Adriano', 'adriano@tetrio.local', 350, 2, 5, 2, 125000)
      ON CONFLICT (username) DO NOTHING;
    `;
  }
}
