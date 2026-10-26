import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { OpponentState, TargetingStrategy, AttackEvent } from './lib/tetris/multiplayerTypes';
import { PieceType } from './lib/tetris/types';

const port = parseInt(process.env.PORT || '3001', 10);

import { sql } from './lib/db';

interface PlayerSession {
  socketId: string;
  username: string;
  roomId: string;
  matrix: (PieceType | 0 | 'G')[][];
  score: number;
  lines: number;
  isAlive: boolean;
  targetId: string | null;
  targetingMode: TargetingStrategy;
  incomingGarbage: number;
  linesSent: number;
  linesReceived: number;
  kos: number;
  lastAttackerId: string | null;
  hp?: number;
  maxHp?: number;
  floor?: number;
}

const rooms: Record<string, Record<string, PlayerSession>> = {};
const roomHosts: Record<string, string> = {}; // roomId -> socketId do host

function getEmptyMatrix(): (PieceType | 0 | 'G')[][] {
  return Array.from({ length: 20 }, () => Array(10).fill(0));
}

const server = createServer((req, res) => {
  // Health check endpoint para Render / Railway
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Tetrio Adriano Multiplayer Server', activeRooms: Object.keys(rooms).length }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000,
});

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUsername: string | null = null;

  async function closeRoomAndNotify(roomId: string, reason: string = 'O anfitrião (host) encerrou ou saiu da sala.') {
    if (!roomId) return;
    console.log(`[Multiplayer] Fechando sala ${roomId}. Motivo: ${reason}`);

    // Notifica todos na sala
    io.to(roomId).emit('room_closed', { reason });

    // Desassocia os sockets da sala
    try {
      const roomSockets = await io.in(roomId).fetchSockets();
      for (const s of roomSockets) {
        s.leave(roomId);
      }
    } catch (err) {
      // Fallback silencioso
    }

    delete rooms[roomId];
    delete roomHosts[roomId];

    // Atualiza e limpa no Neon Database
    try {
      const cleanCode = roomId.toUpperCase().trim();
      await sql`
        DELETE FROM room_players 
        WHERE room_id IN (SELECT id FROM rooms WHERE UPPER(code) = ${cleanCode} OR id = ${roomId});
      `;
      await sql`
        UPDATE rooms 
        SET status = 'finished' 
        WHERE UPPER(code) = ${cleanCode} OR id = ${roomId};
      `;
      console.log(`[Multiplayer] Sala ${roomId} finalizada e fechada no Neon.`);
    } catch (dbErr) {
      console.error(`[Multiplayer] Erro ao fechar sala ${roomId} no Neon:`, dbErr);
    }
  }

  socket.on('join_room', ({ roomId, username, isHost }: { roomId: string; username: string; isHost?: boolean }) => {
    const roomKey = (roomId || 'default-arena').trim();
    currentRoomId = roomKey;
    currentUsername = username || `Player_${socket.id.slice(0, 4)}`;

    socket.join(roomKey);

    if (!rooms[roomKey]) {
      rooms[roomKey] = {};
    }

    // Se é o host declarado ou se é o primeiro a entrar, define como host da sala
    if (isHost || !roomHosts[roomKey]) {
      roomHosts[roomKey] = socket.id;
    }

    if (Object.keys(rooms[roomKey]).length >= 8) {
      socket.emit('room_full', { message: 'A sala atingiu o limite de 8 jogadores!' });
      return;
    }

    rooms[roomKey][socket.id] = {
      socketId: socket.id,
      username: currentUsername,
      roomId: roomKey,
      matrix: getEmptyMatrix(),
      score: 0,
      lines: 0,
      isAlive: true,
      targetId: null,
      targetingMode: 'leader',
      incomingGarbage: 0,
      linesSent: 0,
      linesReceived: 0,
      kos: 0,
      lastAttackerId: null,
    };

    console.log(`[Multiplayer] ${currentUsername} (${socket.id}) entrou na sala ${roomKey} (Host: ${roomHosts[roomKey] === socket.id ? 'SIM' : 'NÃO'}). Total: ${Object.keys(rooms[roomKey]).length}/8`);
    broadcastRoomState(roomKey);
  });

  socket.on('update_matrix', ({ matrix, score, lines, isAlive, hp, maxHp, floor }: { matrix: (PieceType | 0 | 'G')[][]; score: number; lines: number; isAlive: boolean; hp?: number; maxHp?: number; floor?: number }) => {
    if (!currentRoomId || !rooms[currentRoomId] || !rooms[currentRoomId][socket.id]) return;
    const player = rooms[currentRoomId][socket.id];
    const previouslyAlive = player.isAlive;
    player.matrix = matrix;
    player.score = score;
    player.lines = lines;
    player.isAlive = isAlive;
    if (hp !== undefined) player.hp = hp;
    if (maxHp !== undefined) player.maxHp = maxHp;
    if (floor !== undefined) player.floor = floor;

    if (previouslyAlive && !isAlive && player.lastAttackerId && rooms[currentRoomId][player.lastAttackerId]) {
      rooms[currentRoomId][player.lastAttackerId].kos += 1;
    }

    socket.to(currentRoomId).emit('player_updated', {
      id: socket.id,
      username: player.username,
      matrix,
      score,
      lines,
      isAlive,
      incomingGarbage: player.incomingGarbage,
      linesSent: player.linesSent,
      linesReceived: player.linesReceived,
      kos: player.kos,
      hp: player.hp,
      maxHp: player.maxHp,
      floor: player.floor,
    });

    if (!isAlive) {
      checkMatchFinished(currentRoomId);
    }
  });

  socket.on('set_target', ({ targetId, strategy }: { targetId?: string; strategy?: TargetingStrategy }) => {
    if (!currentRoomId || !rooms[currentRoomId] || !rooms[currentRoomId][socket.id]) return;
    const player = rooms[currentRoomId][socket.id];
    if (strategy) player.targetingMode = strategy;
    if (targetId) {
      player.targetId = targetId;
      player.targetingMode = 'manual';
    }
  });

  socket.on('send_attack', ({ lines, type }: { lines: number; type: string }) => {
    if (!currentRoomId || !rooms[currentRoomId] || !rooms[currentRoomId][socket.id]) return;
    const room = rooms[currentRoomId];
    const attacker = room[socket.id];
    if (!attacker || !attacker.isAlive || lines <= 0) return;

    attacker.linesSent += lines;
    const target = resolveTarget(socket.id, room, attacker.targetingMode, attacker.targetId);

    if (target) {
      target.incomingGarbage += lines;
      target.linesReceived += lines;
      target.lastAttackerId = socket.id;

      const attackPayload: AttackEvent = {
        fromId: socket.id,
        fromUsername: attacker.username,
        toId: target.socketId,
        lines,
        type: type as AttackEvent['type'],
      };

      io.to(currentRoomId).emit('attack_occurred', attackPayload);
      io.to(target.socketId).emit('receive_garbage', { lines, fromUsername: attacker.username });
    }
  });

  // Saída e Desconexão com fechamento automático se for o host
  const handleLeaveOrDisconnect = () => {
    if (!currentRoomId) return;
    const roomKey = currentRoomId;

    if (roomHosts[roomKey] === socket.id) {
      console.log(`[Multiplayer] Host ${currentUsername} (${socket.id}) saiu da sala ${roomKey}. Encerrando a sala para todos.`);
      closeRoomAndNotify(roomKey, 'O anfitrião (host) encerrou ou saiu da sala.');
      currentRoomId = null;
      return;
    }

    if (rooms[roomKey] && rooms[roomKey][socket.id]) {
      const username = rooms[roomKey][socket.id].username;
      delete rooms[roomKey][socket.id];
      console.log(`[Multiplayer] ${username} desconectou da sala ${roomKey}.`);
      if (Object.keys(rooms[roomKey]).length === 0) {
        closeRoomAndNotify(roomKey, 'Todos os jogadores saíram da sala.');
      } else {
        broadcastRoomState(roomKey);
        checkMatchFinished(roomKey);
      }
    }
    currentRoomId = null;
  };

  socket.on('leave_room', handleLeaveOrDisconnect);
  socket.on('disconnect', handleLeaveOrDisconnect);
});

function resolveTarget(
  attackerId: string,
  room: Record<string, PlayerSession>,
  mode: TargetingStrategy,
  manualTargetId: string | null
): PlayerSession | null {
  const candidates = Object.values(room).filter(p => p.socketId !== attackerId && p.isAlive);
  if (candidates.length === 0) return null;

  if (mode === 'manual' && manualTargetId && room[manualTargetId] && room[manualTargetId].isAlive) {
    return room[manualTargetId];
  }

  if (mode === 'random') {
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  return candidates.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), candidates[0]);
}

function broadcastRoomState(roomId: string) {
  if (!rooms[roomId]) return;
  const room = rooms[roomId];
  const playersList: OpponentState[] = Object.values(room).map(p => ({
    id: p.socketId,
    username: p.username,
    matrix: p.matrix,
    score: p.score,
    lines: p.lines,
    isAlive: p.isAlive,
    isTargetedByYou: false,
    incomingGarbage: p.incomingGarbage,
    linesSent: p.linesSent,
    linesReceived: p.linesReceived,
    kos: p.kos,
    hp: p.hp,
    maxHp: p.maxHp,
    floor: p.floor,
  }));

  io.to(roomId).emit('room_state', {
    roomId,
    playerCount: playersList.length,
    players: playersList,
  });
}

function checkMatchFinished(roomId: string) {
  if (!rooms[roomId]) return;
  const room = rooms[roomId];
  const players = Object.values(room);
  if (players.length <= 1) return;

  const alivePlayers = players.filter(p => p.isAlive);
  if (alivePlayers.length <= 1) {
    const sortedByScore = [...players].sort((a, b) => {
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;
      return b.score - a.score;
    });

    const ranking = sortedByScore.map((p, idx) => ({
      username: p.username,
      rank: idx + 1,
      score: p.score,
      lines: p.lines,
      won: idx === 0,
      linesSent: p.linesSent,
      linesReceived: p.linesReceived,
      kos: p.kos,
    }));

    io.to(roomId).emit('match_finished', {
      roomId,
      winner: ranking[0],
      ranking,
    });
  }
}

server.listen(port, '0.0.0.0', () => {
  console.log(`> [Standalone Multiplayer Server] Ativo na porta ${port} pronto para deploy na nuvem`);
});
