export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'G';

export type Rotation = 0 | 1 | 2 | 3;

export interface Piece {
  type: PieceType;
  rotation: Rotation;
  x: number;
  y: number;
}

export interface PieceDefinition {
  color: string;
  glow: string;
  shapes: number[][][]; // 4 rotations of 2D grids
}

export interface GameTelemetry {
  score: number;
  lines: number;
  level: number;
  combo: number;
  maxCombo: number;
  piecesPlaced: number;
  pps: number;
  apm: number;
  durationSeconds: number;
  currentGravityMs?: number;
}

export interface TetrisState {
  matrix: (PieceType | 0)[][]; // 20 rows x 10 cols
  currentPiece: Piece | null;
  ghostY: number;
  holdPiece: PieceType | null;
  canHold: boolean;
  nextQueue: PieceType[];
  telemetry: GameTelemetry;
  incomingGarbage: number; // Linhas de lixo aguardando para subir
  isGameOver: boolean;
  isPaused: boolean;
  currentGravityMs: number;
  lastClear: {
    lines: number;
    text: string;
    timestamp: number;
    isTSpin?: boolean;
    clearType?: 'single' | 'double' | 'triple' | 'tetris' | 'combo' | 'tspin' | 'quad';
  } | null;
}
