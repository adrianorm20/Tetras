import { PieceType, Rotation, Piece, TetrisState } from './types';
import { COLS, ROWS, PIECES, PIECE_TYPES, JLSTZ_KICK_DATA, I_KICK_DATA } from './constants';

export class TetrisEngine {
  public state: TetrisState;
  private bag: PieceType[] = [];
  private dropTimer = 0;
  private lockTimer = 0;
  private isLocking = false;
  private moveResets = 0;
  private readonly MAX_LOCK_RESETS = 15;
  private readonly LOCK_DELAY = 500; // ms
  private startTime: number | null = null;
  public onStateChange?: (state: TetrisState) => void;
  public onSoundTrigger?: (sound: 'move' | 'rotate' | 'drop' | 'hold' | 'clear' | 'tetris' | 'gameover') => void;

  constructor() {
    this.state = this.getInitialState();
    this.init();
  }

  private getInitialState(): TetrisState {
    return {
      matrix: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      currentPiece: null,
      ghostY: 0,
      holdPiece: null,
      canHold: true,
      nextQueue: [],
      telemetry: {
        score: 0,
        lines: 0,
        level: 1,
        combo: -1,
        maxCombo: 0,
        piecesPlaced: 0,
        pps: 0,
        apm: 0,
        durationSeconds: 0,
      },
      isGameOver: false,
      isPaused: false,
      lastClear: null,
    };
  }

  public init() {
    this.bag = [];
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
    this.moveResets = 0;
    this.startTime = null;

    // Fill initial next queue (5 pieces)
    const nextQueue: PieceType[] = [];
    for (let i = 0; i < 5; i++) {
      nextQueue.push(this.drawFromBag());
    }

    this.state = {
      ...this.getInitialState(),
      nextQueue,
    };

    this.spawnNextPiece();
    this.notify();
  }

  // 7-Bag Randomizer
  private drawFromBag(): PieceType {
    if (this.bag.length === 0) {
      this.bag = [...PIECE_TYPES].sort(() => Math.random() - 0.5);
    }
    return this.bag.pop()!;
  }

  private spawnNextPiece() {
    const nextType = this.state.nextQueue[0];
    const newNextQueue = [...this.state.nextQueue.slice(1), this.drawFromBag()];
    
    const shapes = PIECES[nextType].shapes[0];
    const spawnX = Math.floor((COLS - shapes[0].length) / 2);
    const spawnY = 0;

    const newPiece: Piece = {
      type: nextType,
      rotation: 0,
      x: spawnX,
      y: spawnY,
    };

    this.isLocking = false;
    this.lockTimer = 0;
    this.moveResets = 0;

    // Check game over on spawn
    if (this.checkCollision(newPiece.type, newPiece.rotation, newPiece.x, newPiece.y)) {
      this.state.isGameOver = true;
      this.state.currentPiece = newPiece;
      this.state.ghostY = newPiece.y;
      this.onSoundTrigger?.('gameover');
      this.notify();
      return;
    }

    this.state.currentPiece = newPiece;
    this.state.nextQueue = newNextQueue;
    this.state.canHold = true;
    this.state.ghostY = this.computeGhostY(newPiece);
    this.notify();
  }

  private checkCollision(type: PieceType, rotation: Rotation, offsetX: number, offsetY: number): boolean {
    const shape = PIECES[type].shapes[rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const matrixX = offsetX + c;
          const matrixY = offsetY + r;

          // Out of horizontal bounds
          if (matrixX < 0 || matrixX >= COLS) return true;
          // Out of bottom boundary
          if (matrixY >= ROWS) return true;
          // Occupied cell in matrix
          if (matrixY >= 0 && this.state.matrix[matrixY][matrixX] !== 0) return true;
        }
      }
    }
    return false;
  }

  private computeGhostY(piece: Piece): number {
    let ghostY = piece.y;
    while (!this.checkCollision(piece.type, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }

  // Moves
  public moveLeft(): boolean {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return false;
    const { type, rotation, x, y } = this.state.currentPiece;
    if (!this.checkCollision(type, rotation, x - 1, y)) {
      this.state.currentPiece.x--;
      this.handlePieceMoved();
      this.onSoundTrigger?.('move');
      this.notify();
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return false;
    const { type, rotation, x, y } = this.state.currentPiece;
    if (!this.checkCollision(type, rotation, x + 1, y)) {
      this.state.currentPiece.x++;
      this.handlePieceMoved();
      this.onSoundTrigger?.('move');
      this.notify();
      return true;
    }
    return false;
  }

  public softDrop(): boolean {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return false;
    const { type, rotation, x, y } = this.state.currentPiece;
    if (!this.checkCollision(type, rotation, x, y + 1)) {
      this.state.currentPiece.y++;
      this.state.telemetry.score += 1;
      this.dropTimer = 0;
      this.notify();
      return true;
    } else {
      this.lockCurrentPiece();
      return true;
    }
  }

  public hardDrop() {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return;
    const ghostY = this.state.ghostY;
    const droppedDistance = ghostY - this.state.currentPiece.y;
    this.state.telemetry.score += droppedDistance * 2;
    this.state.currentPiece.y = ghostY;
    this.onSoundTrigger?.('drop');
    this.lockCurrentPiece();
  }

  // Super Rotation System (SRS)
  public rotateCW(): boolean {
    return this.rotate(1);
  }

  public rotateCCW(): boolean {
    return this.rotate(-1);
  }

  private rotate(dir: 1 | -1): boolean {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return false;
    const { type, rotation, x, y } = this.state.currentPiece;
    const nextRot = ((rotation + dir + 4) % 4) as Rotation;

    // O-piece does not kick or rotate shape
    if (type === 'O') {
      this.state.currentPiece.rotation = nextRot;
      this.onSoundTrigger?.('rotate');
      this.notify();
      return true;
    }

    const kickTable = type === 'I' ? I_KICK_DATA : JLSTZ_KICK_DATA;
    const kickKey = `${rotation}->${nextRot}`;
    const tests = kickTable[kickKey] || [[0, 0]];

    for (const [dx, dy] of tests) {
      if (!this.checkCollision(type, nextRot, x + dx, y - dy)) {
        this.state.currentPiece.rotation = nextRot;
        this.state.currentPiece.x += dx;
        this.state.currentPiece.y -= dy;
        this.handlePieceMoved();
        this.onSoundTrigger?.('rotate');
        this.notify();
        return true;
      }
    }

    return false;
  }

  public hold() {
    if (this.state.isGameOver || this.state.isPaused || !this.state.canHold || !this.state.currentPiece) return;
    const currentType = this.state.currentPiece.type;

    if (this.state.holdPiece === null) {
      this.state.holdPiece = currentType;
      this.spawnNextPiece();
    } else {
      const swappedType = this.state.holdPiece;
      this.state.holdPiece = currentType;
      
      const shapes = PIECES[swappedType].shapes[0];
      const spawnX = Math.floor((COLS - shapes[0].length) / 2);
      const spawnY = 0;

      this.state.currentPiece = {
        type: swappedType,
        rotation: 0,
        x: spawnX,
        y: spawnY,
      };
      this.state.ghostY = this.computeGhostY(this.state.currentPiece);
    }

    this.state.canHold = false;
    this.isLocking = false;
    this.lockTimer = 0;
    this.moveResets = 0;
    this.onSoundTrigger?.('hold');
    this.notify();
  }

  private handlePieceMoved() {
    if (!this.state.currentPiece) return;
    this.state.ghostY = this.computeGhostY(this.state.currentPiece);

    // If resting on ground/surface, reset lock timer up to limit
    const onFloor = this.checkCollision(
      this.state.currentPiece.type,
      this.state.currentPiece.rotation,
      this.state.currentPiece.x,
      this.state.currentPiece.y + 1
    );

    if (onFloor) {
      this.isLocking = true;
      if (this.moveResets < this.MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.moveResets++;
      }
    } else {
      this.isLocking = false;
      this.lockTimer = 0;
    }
  }

  private lockCurrentPiece() {
    const piece = this.state.currentPiece;
    if (!piece) return;

    const shape = PIECES[piece.type].shapes[piece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const matrixY = piece.y + r;
          const matrixX = piece.x + c;
          if (matrixY >= 0 && matrixY < ROWS && matrixX >= 0 && matrixX < COLS) {
            this.state.matrix[matrixY][matrixX] = piece.type;
          }
        }
      }
    }

    if (!this.startTime) this.startTime = Date.now();
    this.state.telemetry.piecesPlaced++;

    this.clearLines();
    this.spawnNextPiece();
  }

  private clearLines() {
    let linesCleared = 0;
    const newMatrix = this.state.matrix.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newMatrix.length < ROWS) {
      newMatrix.unshift(Array(COLS).fill(0));
    }
    this.state.matrix = newMatrix;

    if (linesCleared > 0) {
      this.state.telemetry.combo++;
      if (this.state.telemetry.combo > this.state.telemetry.maxCombo) {
        this.state.telemetry.maxCombo = this.state.telemetry.combo;
      }

      const level = this.state.telemetry.level;
      const baseScores = [0, 100, 300, 500, 800];
      const points = (baseScores[linesCleared] || 1000) * level;
      const comboBonus = this.state.telemetry.combo > 0 ? this.state.telemetry.combo * 50 * level : 0;

      this.state.telemetry.score += points + comboBonus;
      this.state.telemetry.lines += linesCleared;
      this.state.telemetry.level = Math.floor(this.state.telemetry.lines / 10) + 1;

      const clearNames = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'];
      const clearText = clearNames[linesCleared] || `${linesCleared} LINES!`;
      this.state.lastClear = {
        lines: linesCleared,
        text: this.state.telemetry.combo > 0 ? `${clearText} + COMBO x${this.state.telemetry.combo}` : clearText,
        timestamp: Date.now(),
      };

      if (linesCleared === 4) {
        this.onSoundTrigger?.('tetris');
      } else {
        this.onSoundTrigger?.('clear');
      }
    } else {
      this.state.telemetry.combo = -1;
    }
  }

  // 60 FPS Engine Tick
  public tick(deltaMs: number) {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return;

    // Update real-time speed metrics (PPS / APM)
    if (this.startTime) {
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      if (elapsedSec > 0.5) {
        this.state.telemetry.durationSeconds = Math.floor(elapsedSec);
        this.state.telemetry.pps = parseFloat((this.state.telemetry.piecesPlaced / elapsedSec).toFixed(2));
        this.state.telemetry.apm = parseFloat(((this.state.telemetry.lines * 1.5) / (elapsedSec / 60)).toFixed(1));
      }
    }

    // Progressive gravity speed: drops faster at higher levels
    const gravitySpeed = Math.max(80, 1000 - (this.state.telemetry.level - 1) * 85);
    this.dropTimer += deltaMs;

    const onFloor = this.checkCollision(
      this.state.currentPiece.type,
      this.state.currentPiece.rotation,
      this.state.currentPiece.x,
      this.state.currentPiece.y + 1
    );

    if (onFloor) {
      this.isLocking = true;
      this.lockTimer += deltaMs;
      if (this.lockTimer >= this.LOCK_DELAY) {
        this.lockCurrentPiece();
        this.notify();
        return;
      }
    } else {
      this.isLocking = false;
      this.lockTimer = 0;
      if (this.dropTimer >= gravitySpeed) {
        this.dropTimer = 0;
        this.state.currentPiece.y++;
        this.notify();
      }
    }
  }

  public togglePause() {
    if (this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
    this.notify();
  }

  private notify() {
    this.onStateChange?.({ ...this.state });
  }
}
