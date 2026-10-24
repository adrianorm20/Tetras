const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

// Health check endpoint for Neon Postgres service
app.get('/api/health', async (req, res) => {
  try {
    const health = await db.getHealth();
    res.json({
      success: true,
      service: 'Neon Postgres',
      app: 'TETR.IO Adriano',
      ...health
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      service: 'Neon Postgres',
      error: error.message
    });
  }
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = req.query.limit || 15;
    const scores = await db.getLeaderboard(limit);
    res.json({ success: true, scores });
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit score endpoint
app.post('/api/scores', async (req, res) => {
  try {
    const { playerName, score, linesCleared, level, pps, apm, maxCombo } = req.body;
    if (score === undefined || score === null) {
      return res.status(400).json({ success: false, error: 'Score is required' });
    }

    const inserted = await db.addScore({
      playerName: playerName || 'Adriano',
      score,
      linesCleared,
      level,
      pps,
      apm,
      maxCombo
    });

    res.status(201).json({ success: true, entry: inserted });
  } catch (error) {
    console.error('Failed to add score:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Aggregate stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback to index.html
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

// Server start helper
async function startServer(port = PORT) {
  try {
    console.log('[Server] Connecting to Neon Postgres and verifying schema...');
    await db.initSchema();
    console.log('[Server] Database initialized successfully.');

    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        console.log(`[Server] TETR.IO Adriano running at http://localhost:${port}`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error('[Server] Failed to initialize database on startup:', error);
    throw error;
  }
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
