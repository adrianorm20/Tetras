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
  private readonly LOCK_DELAY = 500; // 500ms Lock Delay competitivo padrão Tetr.io
  private startTime: number | null = null;
  private lastMoveWasRotate = false;
  public onStateChange?: (state: TetrisState) => void;
  public onSoundTrigger?: (sound: 'move' | 'rotate' | 'drop' | 'hold' | 'clear' | 'tetris' | 'tspin' | 'gameover' | 'garbage_rise') => void;
  public onGarbageSent?: (lines: number, clearType: 'single' | 'double' | 'triple' | 'tetris' | 'combo' | 'tspin' | 'quad') => void;

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
      incomingGarbage: 0,
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
    this.lastMoveWasRotate = false;

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

  // SRS 3-Corner T-Spin Detection Rule
  private checkTSpin(piece: Piece): boolean {
    if (piece.type !== 'T' || !this.lastMoveWasRotate) return false;
    // Corners around T piece center (piece.x + 1, piece.y + 1)
    const corners = [
      [piece.x, piece.y],
      [piece.x + 2, piece.y],
      [piece.x, piece.y + 2],
      [piece.x + 2, piece.y + 2],
    ];

    let occupiedCorners = 0;
    for (const [cx, cy] of corners) {
      if (cx < 0 || cx >= COLS || cy >= ROWS) {
        occupiedCorners++;
      } else if (cy >= 0 && this.state.matrix[cy][cx] !== 0) {
        occupiedCorners++;
      }
    }

    return occupiedCorners >= 3;
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
      this.lastMoveWasRotate = false;
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
      this.lastMoveWasRotate = false;
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
      this.lastMoveWasRotate = false;
      this.state.telemetry.score += 1;
      this.dropTimer = 0;
      this.handlePieceMoved();
      this.notify();
      return true;
    } else {
      // Se já estiver no chão e o jogador pressionar soft drop, inicia/mantém lock
      this.isLocking = true;
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
      this.lastMoveWasRotate = true;
      this.handlePieceMoved();
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
        this.lastMoveWasRotate = true;
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
    this.lastMoveWasRotate = false;
    this.onSoundTrigger?.('hold');
    this.notify();
  }

  /**
   * Reseta o Lock Delay sempre que a peça for movida ou rotacionada no chão (fórmula padrão Tetr.io)
   */
  private handlePieceMoved() {
    if (!this.state.currentPiece) return;
    this.state.ghostY = this.computeGhostY(this.state.currentPiece);

    const onFloor = this.checkCollision(
      this.state.currentPiece.type,
      this.state.currentPiece.rotation,
      this.state.currentPiece.x,
      this.state.currentPiece.y + 1
    );

    if (onFloor) {
      this.isLocking = true;
      if (this.moveResets < this.MAX_LOCK_RESETS) {
        this.lockTimer = 0; // Reinicia o timer de 500ms
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

    const isTSpin = this.checkTSpin(piece);

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

    this.clearLines(isTSpin);
    this.spawnNextPiece();
  }

  /**
   * Envio de Lixo Avançado (Garbage Sending Fórmula Oficial Tetr.io):
   * 1 Linha = 0 lixo | 2 Linhas = 1 lixo | 3 Linhas = 2 lixo | Tetris (4 Linhas) = 4 lixo
   * T-Spins: TSS = 2 lixo | TSD = 4 lixo | TST = 6 lixo
   * Bônus Combo: +1 lixo a cada 2 combos após combo 1
   * Garbage Queue: O lixo recebido é acumulado e só sobe na matriz quando a peça atual é posicionada
   */
  private clearLines(isTSpin: boolean = false) {
    let linesCleared = 0;
    const preservedRows: (PieceType | 0)[][] = [];

    for (let r = 0; r < ROWS; r++) {
      const row = this.state.matrix[r];
      const isFull = row.every(cell => cell !== 0);
      if (isFull) {
        linesCleared++;
      } else {
        preservedRows.push([...row]);
      }
    }

    const emptyRowsCount = ROWS - preservedRows.length;
    const cleanEmptyRows: (PieceType | 0)[][] = Array.from({ length: emptyRowsCount }, () =>
      Array<0>(COLS).fill(0)
    );

    this.state.matrix = [...cleanEmptyRows, ...preservedRows];

    if (linesCleared > 0 || isTSpin) {
      this.state.telemetry.combo++;
      if (this.state.telemetry.combo > this.state.telemetry.maxCombo) {
        this.state.telemetry.maxCombo = this.state.telemetry.combo;
      }

      const level = this.state.telemetry.level;
      let points = 0;
      let clearText = '';
      let clearType: 'single' | 'double' | 'triple' | 'tetris' | 'combo' | 'tspin' | 'quad' = 'single';
      let attackLines = 0;

      if (isTSpin) {
        const tSpinNames = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'];
        clearText = tSpinNames[linesCleared] || 'T-SPIN!';
        clearType = 'tspin';
        points = (linesCleared === 0 ? 100 : linesCleared === 1 ? 800 : linesCleared === 2 ? 1200 : 1600) * level;
        attackLines = linesCleared === 0 ? 0 : linesCleared === 1 ? 2 : linesCleared === 2 ? 4 : 6;
        this.onSoundTrigger?.('tspin');
      } else if (linesCleared === 4) {
        clearText = 'QUAD!';
        clearType = 'quad';
        points = 800 * level;
        attackLines = 4;
        this.onSoundTrigger?.('tetris');
      } else {
        const clearNames = ['', 'SINGLE', 'DOUBLE', 'TRIPLE'];
        clearText = clearNames[linesCleared] || `${linesCleared} LINES!`;
        clearType = linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single';
        points = (linesCleared === 1 ? 100 : linesCleared === 2 ? 300 : 500) * level;
        // Padrão competitivo: 1 linha = 0 lixo, 2 linhas = 1 lixo, 3 linhas = 2 lixo
        attackLines = linesCleared === 2 ? 1 : linesCleared === 3 ? 2 : 0;
        this.onSoundTrigger?.('clear');
      }

      const comboBonus = this.state.telemetry.combo > 0 ? this.state.telemetry.combo * 50 * level : 0;
      this.state.telemetry.score += points + comboBonus;
      this.state.telemetry.lines += linesCleared;
      this.state.telemetry.level = Math.floor(this.state.telemetry.lines / 10) + 1;

      if (this.state.telemetry.combo > 0) {
        clearText += ` + ×${this.state.telemetry.combo} COMBO`;
      }

      this.state.lastClear = {
        lines: linesCleared,
        text: clearText,
        timestamp: Date.now(),
        isTSpin,
        clearType,
      };

      // Bônus de Ataque por Combo
      if (this.state.telemetry.combo > 1) {
        attackLines += Math.min(4, Math.floor(this.state.telemetry.combo / 2));
      }

      if (attackLines > 0) {
        // Garbage Cancelling (defesa ativa contra lixo pendente na fila)
        if (this.state.incomingGarbage > 0) {
          const cancelled = Math.min(this.state.incomingGarbage, attackLines);
          this.state.incomingGarbage -= cancelled;
          attackLines -= cancelled;
        }

        if (attackLines > 0) {
          this.onGarbageSent?.(attackLines, clearType);
        }
      }

      // Se ainda restou lixo após a anulação e não limpou mais linhas, o lixo remanescente não sobe imediatamente neste turno com clear
    } else {
      this.state.telemetry.combo = -1;

      // O lixo pendente na Garbage Queue só sobe no tabuleiro agora que a peça foi posicionada sem linha limpa
      if (this.state.incomingGarbage > 0) {
        this.pushGarbageLines(this.state.incomingGarbage);
        this.onSoundTrigger?.('garbage_rise');
        this.state.incomingGarbage = 0;
      }
    }
  }

  public addIncomingGarbage(lines: number) {
    if (this.state.isGameOver) return;
    this.state.incomingGarbage += lines;
    this.notify();
  }

  private lastGarbageHoleCol: number = -1;

  public pushGarbageLines(count: number) {
    if (count <= 0 || this.state.isGameOver) return;

    // Regra Tetr.io: se ainda não tiver coluna de buraco definida, escolhe uma aleatória (0 a 9).
    // Para blocos de linhas recebidas juntos (ou sucessivos), mantém a mesma coluna ou desvia no máximo 1 coluna com 20% de chance.
    if (this.lastGarbageHoleCol < 0 || this.lastGarbageHoleCol >= COLS) {
      this.lastGarbageHoleCol = Math.floor(Math.random() * COLS);
    }

    for (let i = 0; i < count; i++) {
      // 85% de chance de manter a MESMA coluna (formando abertura vertical limpa como Tetr.io)
      // 15% de chance de mover suavemente para esquerda/direita se houver espaço
      if (Math.random() > 0.85) {
        const delta = Math.random() < 0.5 ? -1 : 1;
        const newCol = this.lastGarbageHoleCol + delta;
        if (newCol >= 0 && newCol < COLS) {
          this.lastGarbageHoleCol = newCol;
        }
      }

      this.state.matrix.shift();
      const garbageRow: (PieceType | 0)[] = Array(COLS).fill('G');
      garbageRow[this.lastGarbageHoleCol] = 0;
      this.state.matrix.push(garbageRow);
    }

    if (this.state.currentPiece) {
      if (this.checkCollision(this.state.currentPiece.type, this.state.currentPiece.rotation, this.state.currentPiece.x, this.state.currentPiece.y)) {
        this.state.currentPiece.y = Math.max(0, this.state.currentPiece.y - count);
        if (this.checkCollision(this.state.currentPiece.type, this.state.currentPiece.rotation, this.state.currentPiece.x, this.state.currentPiece.y)) {
          this.state.isGameOver = true;
          this.onSoundTrigger?.('gameover');
        }
      }
      this.state.ghostY = this.computeGhostY(this.state.currentPiece);
    }
    this.notify();
  }

  /**
   * 60 FPS Engine Tick com Gravidade Progressiva Contínua
   */
  public tick(deltaMs: number) {
    if (this.state.isGameOver || this.state.isPaused || !this.state.currentPiece) return;

    if (this.startTime) {
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      if (elapsedSec > 0.5) {
        this.state.telemetry.durationSeconds = Math.floor(elapsedSec);
        this.state.telemetry.pps = parseFloat((this.state.telemetry.piecesPlaced / elapsedSec).toFixed(2));
        this.state.telemetry.apm = parseFloat(((this.state.telemetry.lines * 1.5) / (elapsedSec / 60)).toFixed(1));
      }
    }

    // Gravidade Progressiva: aceleração gradual com nível e tempo de partida
    const elapsedMinutes = (this.state.telemetry.durationSeconds || 0) / 60;
    const timeAcceleration = Math.floor(elapsedMinutes * 30);
    const levelFactor = (this.state.telemetry.level - 1) * 75;
    const gravitySpeed = Math.max(60, 1000 - levelFactor - timeAcceleration);

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
      // Ao esgotar o Lock Delay de 500ms, trava a peça definitivamente
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
