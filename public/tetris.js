/**
 * TETR.IO Adriano - Modern Tetris Engine with Neon Serverless Postgres Sync
 */

// --- Audio Synthesizer (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playMove() { this.playTone(320, 'triangle', 0.04, 0.08); }
  playRotate() { this.playTone(480, 'sine', 0.06, 0.12); }
  playHardDrop() { this.playTone(180, 'square', 0.12, 0.2); }
  playHold() { this.playTone(400, 'sine', 0.08, 0.15); }
  playClear(lines) {
    if (lines === 4) {
      // Fanfare for Tetris
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'square', 0.18, 0.2), idx * 70);
      });
    } else {
      [440, 554, 659].slice(0, lines + 1).forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'sine', 0.1, 0.15), idx * 60);
      });
    }
  }
  playGameOver() {
    [400, 350, 300, 240].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.2, 0.2), idx * 90);
    });
  }
}

const sounds = new SoundController();

// --- Tetromino Definitions (SRS Standard) ---
const PIECES = {
  I: {
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.6)',
    shapes: [
      [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
      [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
      [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
      [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
    ]
  },
  J: {
    color: '#2563eb',
    glow: 'rgba(37, 99, 235, 0.6)',
    shapes: [
      [[1,0,0], [1,1,1], [0,0,0]],
      [[0,1,1], [0,1,0], [0,1,0]],
      [[0,0,0], [1,1,1], [0,0,1]],
      [[0,1,0], [0,1,0], [1,1,0]]
    ]
  },
  L: {
    color: '#ff8800',
    glow: 'rgba(255, 136, 0, 0.6)',
    shapes: [
      [[0,0,1], [1,1,1], [0,0,0]],
      [[0,1,0], [0,1,0], [0,1,1]],
      [[0,0,0], [1,1,1], [1,0,0]],
      [[1,1,0], [0,1,0], [0,1,0]]
    ]
  },
  O: {
    color: '#ffd60a',
    glow: 'rgba(255, 214, 10, 0.6)',
    shapes: [
      [[1,1], [1,1]]
    ]
  },
  S: {
    color: '#00f076',
    glow: 'rgba(0, 240, 118, 0.6)',
    shapes: [
      [[0,1,1], [1,1,0], [0,0,0]],
      [[0,1,0], [0,1,1], [0,0,1]],
      [[0,0,0], [0,1,1], [1,1,0]],
      [[1,0,0], [1,1,0], [0,1,0]]
    ]
  },
  T: {
    color: '#9d4edd',
    glow: 'rgba(157, 78, 221, 0.6)',
    shapes: [
      [[0,1,0], [1,1,1], [0,0,0]],
      [[0,1,0], [0,1,1], [0,1,0]],
      [[0,0,0], [1,1,1], [0,1,0]],
      [[0,1,0], [1,1,0], [0,1,0]]
    ]
  },
  Z: {
    color: '#ff3366',
    glow: 'rgba(255, 51, 102, 0.6)',
    shapes: [
      [[1,1,0], [0,1,1], [0,0,0]],
      [[0,0,1], [0,1,1], [0,1,0]],
      [[0,0,0], [1,1,0], [0,1,1]],
      [[0,1,0], [1,1,0], [1,0,0]]
    ]
  }
};

const PIECE_NAMES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// Matrix settings
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 300 x 600 canvas

class TetrisGame {
  constructor() {
    this.matrixCanvas = document.getElementById('matrixCanvas');
    this.matrixCtx = this.matrixCanvas.getContext('2d');
    this.holdCanvas = document.getElementById('holdCanvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCanvas = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.grid = this.createEmptyGrid();
    this.bag = [];
    this.nextQueue = [];
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.maxCombo = 0;
    this.backToBack = false;

    this.piecesPlaced = 0;
    this.startTime = null;
    this.dropInterval = 1000;
    this.dropTimer = 0;
    this.lastFrameTime = 0;

    this.isPaused = false;
    this.isGameOver = false;

    this.bannerTimeout = null;

    this.initQueue();
    this.spawnPiece();
    this.setupControls();
  }

  createEmptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  // 7-Bag Randomizer
  getBag() {
    if (this.bag.length === 0) {
      this.bag = [...PIECE_NAMES].sort(() => Math.random() - 0.5);
    }
    return this.bag.pop();
  }

  initQueue() {
    this.nextQueue = [];
    for (let i = 0; i < 5; i++) {
      this.nextQueue.push(this.getBag());
    }
  }

  pullNext() {
    const next = this.nextQueue.shift();
    this.nextQueue.push(this.getBag());
    return next;
  }

  spawnPiece() {
    const type = this.pullNext();
    const shapes = PIECES[type].shapes;
    const shape = shapes[0];
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;

    this.currentPiece = {
      type,
      rot: 0,
      shape,
      x,
      y
    };

    this.canHold = true;

    // Check game over
    if (this.collides(this.currentPiece.shape, x, y)) {
      this.gameOver();
    }
  }

  collides(shape, offsetX, offsetY) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = offsetX + c;
          const newY = offsetY + r;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && this.grid[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Ghost Piece Calculation
  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.collides(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }

  // Movements
  moveLeft() {
    if (this.isPaused || this.isGameOver) return;
    if (!this.collides(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
      this.currentPiece.x--;
      sounds.playMove();
    }
  }

  moveRight() {
    if (this.isPaused || this.isGameOver) return;
    if (!this.collides(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
      this.currentPiece.x++;
      sounds.playMove();
    }
  }

  softDrop() {
    if (this.isPaused || this.isGameOver) return;
    if (!this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      this.score += 1;
      this.updateTelemetry();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (this.isPaused || this.isGameOver) return;
    const ghostY = this.getGhostY();
    const droppedDistance = ghostY - this.currentPiece.y;
    this.score += droppedDistance * 2;
    this.currentPiece.y = ghostY;
    sounds.playHardDrop();
    this.lockPiece();
  }

  rotateCW() {
    if (this.isPaused || this.isGameOver) return;
    const piece = this.currentPiece;
    const shapes = PIECES[piece.type].shapes;
    const nextRot = (piece.rot + 1) % shapes.length;
    const nextShape = shapes[nextRot];

    // Basic SRS Wall Kicks
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
      if (!this.collides(nextShape, piece.x + kick, piece.y)) {
        piece.x += kick;
        piece.rot = nextRot;
        piece.shape = nextShape;
        sounds.playRotate();
        return;
      }
    }
  }

  rotateCCW() {
    if (this.isPaused || this.isGameOver) return;
    const piece = this.currentPiece;
    const shapes = PIECES[piece.type].shapes;
    const nextRot = (piece.rot - 1 + shapes.length) % shapes.length;
    const nextShape = shapes[nextRot];

    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collides(nextShape, piece.x + kick, piece.y)) {
        piece.x += kick;
        piece.rot = nextRot;
        piece.shape = nextShape;
        sounds.playRotate();
        return;
      }
    }
  }

  hold() {
    if (this.isPaused || this.isGameOver || !this.canHold) return;
    sounds.playHold();
    const currentType = this.currentPiece.type;

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      const shapes = PIECES[temp].shapes;
      this.currentPiece = {
        type: temp,
        rot: 0,
        shape: shapes[0],
        x: Math.floor((COLS - shapes[0][0].length) / 2),
        y: 0
      };
    }
    this.canHold = false;
  }

  lockPiece() {
    const { shape, x, y, type } = this.currentPiece;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gridY = y + r;
          const gridX = x + c;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            this.grid[gridY][gridX] = type;
          }
        }
      }
    }

    this.piecesPlaced++;
    if (!this.startTime) this.startTime = Date.now();

    this.clearLines();
    this.spawnPiece();
    this.updateTelemetry();
  }

  clearLines() {
    let linesCleared = 0;
    const preservedRows = [];

    // Varre todas as linhas de cima para baixo
    for (let r = 0; r < ROWS; r++) {
      const row = this.grid[r];
      const isFull = row.every(cell => cell !== 0);
      if (isFull) {
        linesCleared++;
      } else {
        // Preserva cópia independente da linha
        preservedRows.push([...row]);
      }
    }

    if (linesCleared > 0) {
      const emptyRowsCount = ROWS - preservedRows.length;
      const cleanEmptyRows = Array.from({ length: emptyRowsCount }, () =>
        Array(COLS).fill(0)
      );

      // Substitui o grid completo de cima para baixo
      this.grid = [...cleanEmptyRows, ...preservedRows];
    }

    if (linesCleared > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Score guidelines
      let basePoints = [0, 100, 300, 500, 800][linesCleared] * this.level;
      let isTetris = linesCleared === 4;

      if (isTetris) {
        if (this.backToBack) {
          basePoints = Math.floor(basePoints * 1.5);
          this.showActionBanner('B2B TETRIS!');
        } else {
          this.showActionBanner('TETRIS!');
        }
        this.backToBack = true;
      } else {
        this.backToBack = false;
        const bannerNames = ['', 'SINGLE', 'DOUBLE', 'TRIPLE'];
        let text = bannerNames[linesCleared];
        if (this.combo > 0) text += ` + COMBO x${this.combo}`;
        this.showActionBanner(text);
      }

      this.score += basePoints + (this.combo > 0 ? this.combo * 50 * this.level : 0);
      this.lines += linesCleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 85);

      sounds.playClear(linesCleared);
    } else {
      this.combo = -1;
    }
  }

  showActionBanner(text) {
    const banner = document.getElementById('actionBanner');
    if (!banner) return;
    clearTimeout(this.bannerTimeout);
    banner.textContent = text;
    banner.classList.add('show');
    this.bannerTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, 1100);
  }

  updateTelemetry() {
    document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
    document.getElementById('levelDisplay').textContent = this.level;
    document.getElementById('linesDisplay').textContent = this.lines;

    // Combo & B2B
    const comboGroup = document.getElementById('comboGroup');
    const comboDisplay = document.getElementById('comboDisplay');
    const b2bGroup = document.getElementById('b2bGroup');

    if (this.combo > 0) {
      comboGroup.style.display = 'flex';
      comboDisplay.textContent = this.combo;
    } else {
      comboGroup.style.display = 'none';
    }

    b2bGroup.style.display = this.backToBack ? 'flex' : 'none';

    // PPS & APM
    if (this.startTime) {
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      if (elapsedSec > 0) {
        const pps = (this.piecesPlaced / elapsedSec).toFixed(2);
        document.getElementById('ppsDisplay').textContent = pps;

        const apm = ((this.lines * 1.5) / (elapsedSec / 60)).toFixed(1);
        document.getElementById('apmDisplay').textContent = apm;
      }
    }
  }

  gameOver() {
    this.isGameOver = true;
    sounds.playGameOver();

    const elapsedSec = this.startTime ? (Date.now() - this.startTime) / 1000 : 1;
    const finalPps = (this.piecesPlaced / Math.max(1, elapsedSec)).toFixed(2);

    document.getElementById('goFinalScore').textContent = this.score.toLocaleString();
    document.getElementById('goFinalLines').textContent = this.lines;
    document.getElementById('goFinalPps').textContent = finalPps;
    document.getElementById('goFinalCombo').textContent = this.maxCombo;

    const modal = document.getElementById('gameOverModal');
    modal.classList.remove('hidden');
  }

  restart() {
    document.getElementById('gameOverModal').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.maxCombo = 0;
    this.backToBack = false;
    this.piecesPlaced = 0;
    this.startTime = null;
    this.dropInterval = 1000;
    this.dropTimer = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.holdPiece = null;
    this.canHold = true;
    this.initQueue();
    this.spawnPiece();
    this.updateTelemetry();
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    const overlay = document.getElementById('pauseOverlay');
    if (this.isPaused) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      // Avoid scrolling on space/arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowLeft':
          this.moveLeft();
          break;
        case 'ArrowRight':
          this.moveRight();
          break;
        case 'ArrowDown':
          this.softDrop();
          break;
        case 'ArrowUp':
        case 'KeyX':
          this.rotateCW();
          break;
        case 'KeyZ':
          this.rotateCCW();
          break;
        case 'Space':
          this.hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          this.hold();
          break;
        case 'KeyP':
        case 'Escape':
          this.togglePause();
          break;
        case 'KeyR':
          this.restart();
          break;
      }
    });

    document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
    document.getElementById('btnPlayAgain').addEventListener('click', () => this.restart());
  }

  // Render Loop
  draw() {
    // 1. Draw Arena Grid
    this.matrixCtx.clearRect(0, 0, this.matrixCanvas.width, this.matrixCanvas.height);

    // Subtle grid lines
    this.matrixCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.matrixCtx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      this.matrixCtx.beginPath();
      this.matrixCtx.moveTo(c * BLOCK_SIZE, 0);
      this.matrixCtx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      this.matrixCtx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      this.matrixCtx.beginPath();
      this.matrixCtx.moveTo(0, r * BLOCK_SIZE);
      this.matrixCtx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      this.matrixCtx.stroke();
    }

    // Locked pieces
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c]) {
          this.drawBlock(this.matrixCtx, c, r, PIECES[this.grid[r][c]].color, false);
        }
      }
    }

    if (this.currentPiece && !this.isGameOver) {
      // 2. Draw Ghost Piece
      const ghostY = this.getGhostY();
      const ghostColor = PIECES[this.currentPiece.type].color;
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            this.drawGhostBlock(this.matrixCtx, this.currentPiece.x + c, ghostY + r, ghostColor);
          }
        }
      }

      // 3. Draw Active Piece
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            this.drawBlock(this.matrixCtx, this.currentPiece.x + c, this.currentPiece.y + r, PIECES[this.currentPiece.type].color, true);
          }
        }
      }
    }

    // 4. Draw Hold Box
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (this.holdPiece) {
      this.drawMiniPiece(this.holdCtx, this.holdPiece, 60, 48, this.canHold);
    }

    // 5. Draw Next Queue
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    for (let i = 0; i < this.nextQueue.length; i++) {
      const type = this.nextQueue[i];
      const yCenter = 36 + i * 70;
      this.drawMiniPiece(this.nextCtx, type, 60, yCenter, true);
    }
  }

  drawBlock(ctx, col, row, color, isGlowing = false) {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const size = BLOCK_SIZE;
    const pad = 2;

    if (isGlowing) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }

    // Base fill
    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Bevel highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, 3);
    ctx.fillRect(x + pad, y + pad, 3, size - pad * 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + pad, y + size - pad - 3, size - pad * 2, 3);
    ctx.fillRect(x + size - pad - 3, y + pad, 3, size - pad * 2);

    ctx.shadowBlur = 0;
  }

  drawGhostBlock(ctx, col, row, color) {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const size = BLOCK_SIZE;
    const pad = 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
  }

  drawMiniPiece(ctx, type, centerX, centerY, active) {
    const shape = PIECES[type].shapes[0];
    const color = active ? PIECES[type].color : '#475569';
    const miniSize = 20;
    const pad = 1.5;

    const width = shape[0].length * miniSize;
    const height = shape.length * miniSize;
    const startX = centerX - width / 2;
    const startY = centerY - height / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const x = startX + c * miniSize;
          const y = startY + r * miniSize;

          ctx.fillStyle = color;
          ctx.fillRect(x + pad, y + pad, miniSize - pad * 2, miniSize - pad * 2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(x + pad, y + pad, miniSize - pad * 2, 2);
        }
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isGameOver) return;

    this.dropTimer += delta;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
        this.currentPiece.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  run(time = 0) {
    const delta = time - this.lastFrameTime;
    this.lastFrameTime = time;

    this.update(delta);
    this.draw();

    requestAnimationFrame((t) => this.run(t));
  }
}

// --- Neon Postgres API Integration ---
class NeonApiClient {
  constructor() {
    this.healthBadge = document.getElementById('dbStatusBadge');
    this.statusText = document.getElementById('dbStatusText');
    this.branchPill = document.getElementById('dbBranchPill');
    this.pingText = document.getElementById('dbPingText');

    this.recordPlayer = document.getElementById('recordPlayer');
    this.recordScore = document.getElementById('recordScore');
    this.recordMeta = document.getElementById('recordMeta');

    this.initEvents();
    this.checkHealth();
    this.loadLeaderboard();
  }

  initEvents() {
    // Sound Toggle
    const soundBtn = document.getElementById('btnToggleSound');
    soundBtn.addEventListener('click', () => {
      sounds.enabled = !sounds.enabled;
      document.getElementById('iconSoundOn').classList.toggle('hidden', !sounds.enabled);
      document.getElementById('iconSoundOff').classList.toggle('hidden', sounds.enabled);
    });

    // Leaderboard Modal
    document.getElementById('btnOpenLeaderboard').addEventListener('click', () => this.openLeaderboard());
    document.getElementById('btnCloseLeaderboard').addEventListener('click', () => this.closeModal('leaderboardModal'));
    document.getElementById('btnCloseLeaderboardFooter').addEventListener('click', () => this.closeModal('leaderboardModal'));
    document.getElementById('btnRefreshLeaderboard').addEventListener('click', () => this.loadLeaderboardTable());

    // Health Modal
    document.getElementById('btnOpenHealth').addEventListener('click', () => this.openHealth());
    document.getElementById('dbStatusBadge').addEventListener('click', () => this.openHealth());
    document.getElementById('btnCloseHealth').addEventListener('click', () => this.closeModal('healthModal'));
    document.getElementById('btnCloseHealthFooter').addEventListener('click', () => this.closeModal('healthModal'));
    document.getElementById('btnRunPingTest').addEventListener('click', () => this.openHealth());

    // Score Submission Form
    document.getElementById('scoreSubmitForm').addEventListener('submit', (e) => this.handleScoreSubmit(e));
  }

  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  async checkHealth() {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const clientLatency = Date.now() - startTime;

      if (data.success) {
        this.statusText.textContent = 'Connected';
        this.statusText.style.color = '#00f076';
        this.branchPill.textContent = data.branch || 'production';
        this.pingText.textContent = `${data.latencyMs || clientLatency} ms`;
        this.lastHealthData = data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.warn('Neon healthcheck warning:', err);
      this.statusText.textContent = 'Degraded';
      this.statusText.style.color = '#ff3366';
      this.pingText.textContent = 'Error';
    }
  }

  async loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard?limit=1');
      const data = await res.json();
      if (data.success && data.scores && data.scores.length > 0) {
        const top = data.scores[0];
        this.recordPlayer.textContent = top.player_name;
        this.recordScore.textContent = parseInt(top.score, 10).toLocaleString();
        this.recordMeta.textContent = `Lvl ${top.level} // ${top.lines_cleared} lines // ${top.pps || 0} PPS`;
      }
    } catch (err) {
      console.error('Error fetching top record:', err);
    }
  }

  async openLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('hidden');
    await this.loadLeaderboardTable();
  }

  async loadLeaderboardTable() {
    const tbody = document.getElementById('leaderboardTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Fetching rows from Neon Postgres...</td></tr>';

    try {
      const res = await fetch('/api/leaderboard?limit=25');
      const data = await res.json();

      if (!data.success || !data.scores) {
        tbody.innerHTML = `<tr><td colspan="7" class="error-cell">Failed: ${data.error}</td></tr>`;
        return;
      }

      if (data.scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No records yet. Be the first!</td></tr>';
        return;
      }

      tbody.innerHTML = data.scores.map((row, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
        const dateStr = new Date(row.created_at).toLocaleDateString();
        return `
          <tr>
            <td><span class="rank-badge ${rankClass}">#${idx + 1}</span></td>
            <td class="player-highlight">${escapeHtml(row.player_name)}</td>
            <td><strong>${parseInt(row.score, 10).toLocaleString()}</strong></td>
            <td>${row.lines_cleared}</td>
            <td>${row.level}</td>
            <td>${row.pps || '0.00'}</td>
            <td>${dateStr}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="error-cell">Error: ${err.message}</td></tr>`;
    }
  }

  async openHealth() {
    const modal = document.getElementById('healthModal');
    const body = document.getElementById('healthModalBody');
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="diag-loading">Running query against Neon Postgres...</div>';

    try {
      const startTime = performance.now();
      const res = await fetch('/api/health');
      const data = await res.json();
      const duration = (performance.now() - startTime).toFixed(1);

      if (!data.success) {
        body.innerHTML = `<div class="error-cell">Diagnostics failed: ${data.error}</div>`;
        return;
      }

      body.innerHTML = `
        <div class="diag-grid">
          <div class="diag-card">
            <div class="diag-key">SERVICE STATUS</div>
            <div class="diag-val" style="color: #00f076;">Active / Online</div>
          </div>
          <div class="diag-card">
            <div class="diag-key">ROUNDTRIP LATENCY</div>
            <div class="diag-val" style="color: #00f2fe;">${data.latencyMs || duration} ms</div>
          </div>
          <div class="diag-card">
            <div class="diag-key">NEON BRANCH</div>
            <div class="diag-val">${data.branch}</div>
          </div>
          <div class="diag-card">
            <div class="diag-key">DATABASE NAME</div>
            <div class="diag-val">${data.database}</div>
          </div>
          <div class="diag-card" style="grid-column: span 2;">
            <div class="diag-key">POSTGRES ENGINE VERSION</div>
            <div class="diag-val" style="font-size: 11px;">${data.version}</div>
          </div>
          <div class="diag-card">
            <div class="diag-key">PGBOUNCER POOLING</div>
            <div class="diag-val" style="color: #00f076;">Enabled (DATABASE_URL)</div>
          </div>
          <div class="diag-card">
            <div class="diag-key">TOTAL RECORDS SAVED</div>
            <div class="diag-val" style="color: #ffd60a;">${data.totalScores} entries</div>
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="error-cell">Error: ${err.message}</div>`;
    }
  }

  async handleScoreSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitScore');
    const msg = document.getElementById('submitMessage');
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim() || 'Adriano';

    btn.disabled = true;
    msg.className = 'submit-message';
    msg.textContent = 'Writing score to Neon Postgres...';

    const finalScore = game.score;
    const finalLines = game.lines;
    const finalLvl = game.level;
    const elapsed = game.startTime ? (Date.now() - game.startTime) / 1000 : 1;
    const pps = (game.piecesPlaced / Math.max(1, elapsed)).toFixed(2);
    const apm = ((game.lines * 1.5) / (elapsed / 60)).toFixed(1);

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          score: finalScore,
          linesCleared: finalLines,
          level: finalLvl,
          pps: parseFloat(pps),
          apm: parseFloat(apm),
          maxCombo: game.maxCombo
        })
      });

      const result = await res.json();
      if (result.success) {
        msg.className = 'submit-message success';
        msg.textContent = '✔ Score successfully persisted to Neon Postgres!';
        await this.loadLeaderboard();
        setTimeout(() => {
          this.closeModal('gameOverModal');
          btn.disabled = false;
        }, 1200);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      msg.className = 'submit-message error';
      msg.textContent = `✖ Failed to submit: ${err.message}`;
      btn.disabled = false;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// Start Game and API Client
let game;
let api;

window.addEventListener('DOMContentLoaded', () => {
  game = new TetrisGame();
  api = new NeonApiClient();
  game.run();
});
