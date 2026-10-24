export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

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
}

export interface TetrisState {
  matrix: (PieceType | 0)[][]; // 20 rows x 10 cols
  currentPiece: Piece | null;
  ghostY: number;
  holdPiece: PieceType | null;
  canHold: boolean;
  nextQueue: PieceType[];
  telemetry: GameTelemetry;
  isGameOver: boolean;
  isPaused: boolean;
  lastClear: {
    lines: number;
    text: string;
    timestamp: number;
  } | null;
}
