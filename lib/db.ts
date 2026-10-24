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

export interface RoomRecord {
  id: string;
  code: string;
  name: string;
  host_id: number;
  is_public: boolean;
  max_players: number;
  status: 'waiting' | 'in_game' | 'finished';
  created_at: string;
  updated_at: string;
  player_count?: number;
}

/**
 * Fórmula de Progressão de XP:
 * XP necessário para alcançar o nível N = 100 * (N - 1)^1.5 + 100 * (N - 1)
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

let isDbInitialized = false;
let initDbPromise: Promise<void> | null = null;

/**
 * Inicialização / Migração do esquema SQL no Neon (Executado apenas uma vez de forma segura / idempotente)
 */
export async function initDatabase(): Promise<void> {
  if (isDbInitialized) return;
  if (initDbPromise) return initDbPromise;

  initDbPromise = (async () => {
    try {
      await sqlDirect`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100),
          password_hash VARCHAR(255),
          xp INTEGER NOT NULL DEFAULT 0,
          level INTEGER NOT NULL DEFAULT 1,
          matches_played INTEGER NOT NULL DEFAULT 0,
          wins INTEGER NOT NULL DEFAULT 0,
          high_score INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Garante que a coluna password_hash exista caso tabela já tenha sido criada anteriormente
      await sqlDirect`
        ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      `;

      // Tabela de salas multiplayer (compatível com Vercel / Neon)
      await sqlDirect`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(20) PRIMARY KEY,
          code VARCHAR(6) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          host_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
          is_public BOOLEAN NOT NULL DEFAULT TRUE,
          max_players INTEGER NOT NULL DEFAULT 8,
          status VARCHAR(20) NOT NULL DEFAULT 'waiting',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sqlDirect`
        CREATE TABLE IF NOT EXISTS room_players (
          id SERIAL PRIMARY KEY,
          room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
          player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
          is_ready BOOLEAN NOT NULL DEFAULT FALSE,
          is_host BOOLEAN NOT NULL DEFAULT FALSE,
          last_seen TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(room_id, player_id)
        );
      `;

      // Índices otimizados
      await sqlDirect`
        CREATE INDEX IF NOT EXISTS idx_players_high_score ON players (high_score DESC);
      `;
      await sqlDirect`
        CREATE INDEX IF NOT EXISTS idx_players_level_xp ON players (level DESC, xp DESC);
      `;
      await sqlDirect`
        CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
      `;
      await sqlDirect`
        CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms (is_public, status);
      `;

      // Popula dados de seed iniciais se a tabela for nova
      const existing = await sql`SELECT COUNT(*) as count FROM players;`;
      const count = parseInt(String((existing[0] as { count: string })?.count || '0'), 10);

      if (count <= 2) {
        await sql`
          INSERT INTO players (username, email, xp, level, matches_played, wins, high_score)
          VALUES 
            ('Adriano', 'adriano@tetrio.local', 4190, 11, 6, 3, 165000),
            ('Kazuya_SRS', 'kazuya@tetrio.local', 18900, 24, 62, 45, 345000),
            ('Dren_99', 'dren@tetrio.local', 14200, 21, 48, 30, 298000),
            ('HyperSpeed', 'hyper@tetrio.local', 11500, 19, 39, 21, 280000),
            ('MatrixQueen', 'queen@tetrio.local', 9200, 16, 34, 18, 242000),
            ('TetrisBot_V2', 'bot@tetrio.local', 7800, 15, 29, 12, 215000),
            ('NeonFlick', 'neonflick@tetrio.local', 6400, 13, 24, 10, 198000),
            ('CyberDrop', 'cyber@tetrio.local', 5100, 12, 19, 7, 182000),
            ('SpinMaster_T', 'spin@tetrio.local', 3800, 10, 15, 6, 154000),
            ('BlockBuster', 'block@tetrio.local', 2900, 8, 12, 4, 138000),
            ('ZeroGravity', 'zero@tetrio.local', 2100, 6, 9, 2, 112000)
          ON CONFLICT (username) DO NOTHING;
        `;
      }

      isDbInitialized = true;
    } catch (err) {
      console.error('[Neon DB] Erro durante initDatabase:', err);
      throw err;
    } finally {
      initDbPromise = null;
    }
  })();

  return initDbPromise;
}

export interface MatchUpdateInput {
  username: string;
  score: number;
  earnedXp: number;
  won: boolean;
}

export interface MatchUpdateResult {
  player: PlayerProfile;
  progress: ReturnType<typeof getLevelFromXp>;
  didLevelUp: boolean;
  isNewHighScore: boolean;
}

/**
 * Operação transacional de atualização de progresso de partida no Neon com tipagem estrita
 */
export async function updatePlayerMatchProgress(input: MatchUpdateInput): Promise<MatchUpdateResult> {
  const username = input.username.trim();
  const score = Math.max(0, input.score);
  const earnedXp = Math.max(0, input.earnedXp);
  const won = !!input.won;

  // 1. Busca jogador atual ou cria caso seja nova conta
  let rows = await sql`
    SELECT id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at
    FROM players 
    WHERE username = ${username}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    await sql`
      INSERT INTO players (username, email, xp, level, matches_played, wins, high_score)
      VALUES (${username}, ${`${username.toLowerCase()}@tetrio.local`}, 0, 1, 0, 0, 0)
      ON CONFLICT (username) DO NOTHING;
    `;
    rows = await sql`
      SELECT id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at
      FROM players 
      WHERE username = ${username}
      LIMIT 1;
    `;
  }

  const current = rows[0] as unknown as PlayerProfile;
  const newTotalXp = current.xp + earnedXp;
  const newProgress = getLevelFromXp(newTotalXp);
  const isNewHighScore = score > current.high_score;
  const updatedHighScore = Math.max(current.high_score, score);
  const didLevelUp = newProgress.level > current.level;

  // 2. Atualização atômica
  const updatedRows = await sql`
    UPDATE players
    SET 
      xp = ${newTotalXp},
      level = ${newProgress.level},
      matches_played = matches_played + 1,
      wins = wins + ${won ? 1 : 0},
      high_score = ${updatedHighScore},
      updated_at = NOW()
    WHERE username = ${username}
    RETURNING id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at;
  `;

  const updatedPlayer = updatedRows[0] as unknown as PlayerProfile;

  return {
    player: updatedPlayer,
    progress: newProgress,
    didLevelUp,
    isNewHighScore,
  };
}

/**
 * Consulta otimizada: Top 10 Maiores High Scores
 */
export async function getTopHighScores(limit = 10): Promise<PlayerProfile[]> {
  try {
    const rows = await sql`
      SELECT id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at
      FROM players
      ORDER BY high_score DESC, updated_at ASC
      LIMIT ${limit};
    `;
    return rows as unknown as PlayerProfile[];
  } catch (err) {
    console.error('[Neon DB] Erro em getTopHighScores:', err);
    throw err;
  }
}

/**
 * Consulta otimizada: Top 10 Maiores Níveis de Conta (desempate por XP)
 */
export async function getTopAccountLevels(limit = 10): Promise<PlayerProfile[]> {
  try {
    const rows = await sql`
      SELECT id, username, email, xp, level, matches_played, wins, high_score, created_at, updated_at
      FROM players
      ORDER BY level DESC, xp DESC, updated_at ASC
      LIMIT ${limit};
    `;
    return rows as unknown as PlayerProfile[];
  } catch (err) {
    console.error('[Neon DB] Erro em getTopAccountLevels:', err);
    throw err;
  }
}
