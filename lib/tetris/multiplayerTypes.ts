import { PieceType } from './types';

export type TargetingStrategy = 'manual' | 'leader' | 'payback' | 'random';

export interface OpponentState {
  id: string;
  username: string;
  matrix: (PieceType | 0 | 'G')[][]; // 'G' = Garbage block
  score: number;
  lines: number;
  isAlive: boolean;
  isTargetedByYou: boolean;
  incomingGarbage: number; // Linhas de lixo na fila para receber
  linesSent?: number;
  linesReceived?: number;
  kos?: number;
}

export interface AttackEvent {
  fromId: string;
  fromUsername: string;
  toId: string;
  lines: number;
  type: 'single' | 'double' | 'triple' | 'tetris' | 'combo' | 'tspin' | 'quad';
}

export interface MultiplayerRoomState {
  roomId: string;
  hostId: string;
  status: 'waiting' | 'in_game' | 'finished';
  players: OpponentState[];
}
