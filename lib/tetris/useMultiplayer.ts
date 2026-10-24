'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { OpponentState, TargetingStrategy, AttackEvent } from './multiplayerTypes';
import { PieceType } from './types';

export interface MultiplayerRoomData {
  roomId: string;
  playerCount: number;
  players: OpponentState[];
}

export interface MatchFinishedData {
  roomId: string;
  winner: { username: string; rank: number; score: number; lines: number; won: boolean };
  ranking: { username: string; rank: number; score: number; lines: number; won: boolean }[];
}

export interface UseMultiplayerReturn {
  isConnected: boolean;
  roomState: MultiplayerRoomData | null;
  opponents: OpponentState[];
  incomingGarbage: number;
  lastAttack: AttackEvent | null;
  matchResult: MatchFinishedData | null;
  roomError: string | null;
  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: () => void;
  sendMatrixUpdate: (matrix: (PieceType | 0 | 'G')[][], score: number, lines: number, isAlive: boolean) => void;
  sendAttack: (lines: number, type: AttackEvent['type']) => void;
  setTarget: (targetId?: string, strategy?: TargetingStrategy) => void;
  consumeGarbage: () => void;
  mySocketId: string | null;
  currentStrategy: TargetingStrategy;
  currentTargetId: string | null;
}

export function useMultiplayer(): UseMultiplayerReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<MultiplayerRoomData | null>(null);
  const [opponents, setOpponents] = useState<OpponentState[]>([]);
  const [incomingGarbage, setIncomingGarbage] = useState(0);
  const [lastAttack, setLastAttack] = useState<AttackEvent | null>(null);
  const [matchResult, setMatchResult] = useState<MatchFinishedData | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<TargetingStrategy>('leader');
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setMySocketId(socket.id ?? null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setMySocketId(null);
    });

    socket.on('room_state', (data: MultiplayerRoomData) => {
      setRoomState(data);
      // Filter out self from opponents list
      const myId = socket.id;
      setOpponents(data.players.filter(p => p.id !== myId));
    });

    socket.on('player_updated', (data: OpponentState) => {
      setOpponents(prev => {
        const existing = prev.find(p => p.id === data.id);
        if (!existing) return [...prev, data];
        return prev.map(p => p.id === data.id ? { ...p, ...data } : p);
      });
    });

    socket.on('receive_garbage', ({ lines }: { lines: number; fromUsername: string }) => {
      setIncomingGarbage(prev => prev + lines);
    });

    socket.on('attack_occurred', (attack: AttackEvent) => {
      setLastAttack(attack);
      setTimeout(() => setLastAttack(null), 2500);
    });

    socket.on('match_finished', (result: MatchFinishedData) => {
      setMatchResult(result);
    });

    socket.on('room_full', ({ message }: { message: string }) => {
      setRoomError(message);
    });

    return () => {
      socket.disconnect();
      socket.removeAllListeners();
    };
  }, []);

  const joinRoom = useCallback((roomId: string, username: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    setMatchResult(null);
    setRoomError(null);
    setIncomingGarbage(0);
    setOpponents([]);
    if (!socket.connected) socket.connect();
    socket.emit('join_room', { roomId, username });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket) socket.disconnect();
    setRoomState(null);
    setOpponents([]);
    setMatchResult(null);
    setIncomingGarbage(0);
  }, []);

  const sendMatrixUpdate = useCallback(
    (matrix: (PieceType | 0 | 'G')[][], score: number, lines: number, isAlive: boolean) => {
      socketRef.current?.emit('update_matrix', { matrix, score, lines, isAlive });
    },
    []
  );

  const sendAttack = useCallback((lines: number, type: AttackEvent['type']) => {
    socketRef.current?.emit('send_attack', { lines, type });
  }, []);

  const setTarget = useCallback((targetId?: string, strategy?: TargetingStrategy) => {
    socketRef.current?.emit('set_target', { targetId, strategy });
    if (strategy) setCurrentStrategy(strategy);
    if (targetId) {
      setCurrentTargetId(targetId);
      setCurrentStrategy('manual');
    }
  }, []);

  const consumeGarbage = useCallback(() => {
    setIncomingGarbage(0);
  }, []);

  return {
    isConnected,
    roomState,
    opponents,
    incomingGarbage,
    lastAttack,
    matchResult,
    roomError,
    joinRoom,
    leaveRoom,
    sendMatrixUpdate,
    sendAttack,
    setTarget,
    consumeGarbage,
    mySocketId,
    currentStrategy,
    currentTargetId,
  };
}
