/**
 * End-to-End Test Suite for TETR.IO Adriano & Neon Postgres Services
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const db = require('../src/db');
const { app } = require('../src/server');
const http = require('http');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting End-to-End Tests for Neon Postgres Services');
  console.log('====================================================');

  const testResults = [];
  const recordTest = (name, passed, details = '') => {
    testResults.push({ name, passed, details });
    const mark = passed ? '✔ PASS' : '✖ FAIL';
    console.log(`${mark}: ${name}${details ? ` -> ${details}` : ''}`);
  };

  // Test 1: Env configuration
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasUnpooled = !!process.env.DATABASE_URL_UNPOOLED;
  recordTest('Environment Variables Loaded', hasDbUrl && hasUnpooled, 
    `Branch: ${process.env.NEON_BRANCH || 'production'}, Pooled: ${hasDbUrl}, Unpooled: ${hasUnpooled}`);

  // Test 2: Direct connection & schema migration
  try {
    await db.initSchema();
    recordTest('Schema Initialization (DATABASE_URL_UNPOOLED)', true, 'Tables and constraints verified');
  } catch (err) {
    recordTest('Schema Initialization (DATABASE_URL_UNPOOLED)', false, err.message);
    throw err;
  }

  // Test 3: Health check query
  try {
    const health = await db.getHealth();
    recordTest('Neon Health Check (DATABASE_URL)', health.status === 'healthy',
      `DB: ${health.database}, Latency: ${health.latencyMs}ms, Total Records: ${health.totalScores}`);
  } catch (err) {
    recordTest('Neon Health Check (DATABASE_URL)', false, err.message);
    throw err;
  }

  // Test 4: Insert score operation
  let insertedId = null;
  const testPlayer = `E2E_Tester_${Date.now().toString().slice(-4)}`;
  try {
    const inserted = await db.addScore({
      playerName: testPlayer,
      score: 175400,
      linesCleared: 52,
      level: 7,
      pps: 2.15,
      apm: 58.2,
      maxCombo: 6
    });
    insertedId = inserted.id;
    recordTest('Insert Score Query (Neon INSERT)', !!insertedId,
      `Inserted record ID: ${insertedId} for ${inserted.player_name} (Score: ${inserted.score})`);
  } catch (err) {
    recordTest('Insert Score Query (Neon INSERT)', false, err.message);
    throw err;
  }

  // Test 5: Leaderboard query
  try {
    const leaderboard = await db.getLeaderboard(20);
    const found = leaderboard.some(r => r.player_name === testPlayer);
    recordTest('Leaderboard Fetch Query (Neon SELECT)', found,
      `Fetched ${leaderboard.length} rows, verified test entry exists`);
  } catch (err) {
    recordTest('Leaderboard Fetch Query (Neon SELECT)', false, err.message);
    throw err;
  }

  // Test 6: Aggregated statistics query
  try {
    const stats = await db.getStats();
    recordTest('Aggregate Statistics Query (Neon GROUP/AVG)', parseInt(stats.total_games, 10) > 0,
      `Total Games: ${stats.total_games}, High Score: ${stats.high_score}, Total Lines: ${stats.total_lines}`);
  } catch (err) {
    recordTest('Aggregate Statistics Query (Neon GROUP/AVG)', false, err.message);
    throw err;
  }

  // Test 7: HTTP REST API Endpoints with Live Express Server
  const testPort = 3456;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(testPort, resolve));
  console.log(`\n📡 Live Test Server listening on http://localhost:${testPort}`);

  const fetchJson = async (endpoint, options = {}) => {
    const url = `http://localhost:${testPort}${endpoint}`;
    const res = await fetch(url, options);
    const data = await res.json();
    return { status: res.status, data };
  };

  try {
    // 7a. GET /api/health
    const healthRes = await fetchJson('/api/health');
    recordTest('HTTP GET /api/health', healthRes.status === 200 && healthRes.data.success,
      `Service: ${healthRes.data.service}, Latency: ${healthRes.data.latencyMs}ms`);

    // 7b. GET /api/leaderboard
    const lbRes = await fetchJson('/api/leaderboard');
    recordTest('HTTP GET /api/leaderboard', lbRes.status === 200 && Array.isArray(lbRes.data.scores),
      `Returned ${lbRes.data.scores.length} scores`);

    // 7c. POST /api/scores
    const postRes = await fetchJson('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'API_E2E_Bot',
        score: 99990,
        linesCleared: 30,
        level: 4,
        pps: 1.75,
        apm: 40.0,
        maxCombo: 4
      })
    });
    recordTest('HTTP POST /api/scores', postRes.status === 201 && postRes.data.success,
      `Created score ID: ${postRes.data.entry.id} via REST API`);

    // 7d. GET /
    const htmlRes = await fetch(`http://localhost:${testPort}/`);
    const htmlText = await htmlRes.text();
    recordTest('HTTP GET / (Static Frontend)', htmlRes.status === 200 && htmlText.includes('TETR.IO'),
      'Served index.html with TETR.IO Adriano markup');

  } finally {
    server.close();
  }

  // Summary
  console.log('\n====================================================');
  const allPassed = testResults.every(t => t.passed);
  if (allPassed) {
    console.log('🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY! (10/10)');
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    console.log('====================================================');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
