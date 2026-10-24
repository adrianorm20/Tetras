const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local (default from neon deploy) or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;
const NEON_BRANCH = process.env.NEON_BRANCH || 'production';

if (!DATABASE_URL) {
  console.warn('[Neon DB] Warning: DATABASE_URL is not set. Check .env.local or run `neon deploy`.');
}

// Neon driver:
// 1. Pooled client for high-throughput app queries via PgBouncer
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// 2. Direct client for DDL migrations as recommended by Neon skills
const sqlDirect = DATABASE_URL_UNPOOLED ? neon(DATABASE_URL_UNPOOLED) : sql;

/**
 * Initialize database schema using direct connection (DATABASE_URL_UNPOOLED)
 */
async function initSchema() {
  if (!sqlDirect) {
    throw new Error('Database connection URL not found. Ensure DATABASE_URL is set.');
  }

  console.log(`[Neon DB] Initializing schema on branch "${NEON_BRANCH}" using direct connection...`);

  // Create leaderboard table
  await sqlDirect`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(50) NOT NULL,
      score INTEGER NOT NULL,
      lines_cleared INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      pps NUMERIC(5,2) DEFAULT 0.00,
      apm NUMERIC(6,2) DEFAULT 0.00,
      max_combo INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Create game_sessions table
  await sqlDirect`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(50) NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      pieces_placed INTEGER NOT NULL DEFAULT 0,
      lines_cleared INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Check if initial seed exists
  const existingScores = await sql`SELECT count(*) as count FROM leaderboard;`;
  const count = parseInt(existingScores[0].count, 10);

  if (count === 0) {
    console.log('[Neon DB] Seeding initial leaderboard entries...');
    await sql`
      INSERT INTO leaderboard (player_name, score, lines_cleared, level, pps, apm, max_combo)
      VALUES 
        ('Adriano (Champion)', 245000, 72, 10, 2.45, 68.5, 9),
        ('TetrioBot_Pro', 188400, 58, 8, 2.10, 54.0, 7),
        ('NeonMaster', 142000, 44, 6, 1.85, 42.0, 5);
    `;
    console.log('[Neon DB] Seed completed.');
  }

  console.log('[Neon DB] Schema verification complete.');
}

/**
 * Health check on Neon Postgres
 */
async function getHealth() {
  const startTime = Date.now();
  const result = await sql`
    SELECT 
      version(), 
      current_database() as database, 
      NOW() as server_time,
      pg_is_in_recovery() as in_recovery;
  `;
  const latencyMs = Date.now() - startTime;

  const countResult = await sql`SELECT count(*) as total_scores FROM leaderboard;`;

  return {
    status: 'healthy',
    branch: NEON_BRANCH,
    latencyMs,
    database: result[0].database,
    version: result[0].version,
    serverTime: result[0].server_time,
    totalScores: parseInt(countResult[0].total_scores, 10),
    connection: {
      pooled: !!DATABASE_URL,
      unpooledAvailable: !!DATABASE_URL_UNPOOLED
    }
  };
}

/**
 * Fetch top scores for leaderboard
 */
async function getLeaderboard(limit = 15) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 15), 100);
  const rows = await sql`
    SELECT 
      id, 
      player_name, 
      score, 
      lines_cleared, 
      level, 
      pps, 
      apm, 
      max_combo, 
      created_at
    FROM leaderboard
    ORDER BY score DESC, created_at ASC
    LIMIT ${safeLimit};
  `;
  return rows;
}

/**
 * Record a game score into Neon database
 */
async function addScore({ playerName, score, linesCleared, level, pps, apm, maxCombo }) {
  const cleanName = (playerName || 'Player').trim().slice(0, 50);
  const safeScore = Math.max(0, parseInt(score, 10) || 0);
  const safeLines = Math.max(0, parseInt(linesCleared, 10) || 0);
  const safeLevel = Math.max(1, parseInt(level, 10) || 1);
  const safePps = Math.max(0, parseFloat(pps) || 0);
  const safeApm = Math.max(0, parseFloat(apm) || 0);
  const safeMaxCombo = Math.max(0, parseInt(maxCombo, 10) || 0);

  const inserted = await sql`
    INSERT INTO leaderboard (player_name, score, lines_cleared, level, pps, apm, max_combo)
    VALUES (${cleanName}, ${safeScore}, ${safeLines}, ${safeLevel}, ${safePps}, ${safeApm}, ${safeMaxCombo})
    RETURNING *;
  `;

  return inserted[0];
}

/**
 * Get aggregated gameplay statistics
 */
async function getStats() {
  const stats = await sql`
    SELECT 
      COUNT(*) as total_games,
      COALESCE(MAX(score), 0) as high_score,
      COALESCE(AVG(score), 0)::INTEGER as avg_score,
      COALESCE(SUM(lines_cleared), 0) as total_lines,
      COALESCE(MAX(max_combo), 0) as record_combo
    FROM leaderboard;
  `;
  return stats[0];
}

module.exports = {
  sql,
  sqlDirect,
  initSchema,
  getHealth,
  getLeaderboard,
  addScore,
  getStats,
  NEON_BRANCH
};
