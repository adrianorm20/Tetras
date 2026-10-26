import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { OpponentState, TargetingStrategy, AttackEvent } from './lib/tetris/multiplayerTypes';
import { PieceType } from './lib/tetris/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/192\.168\./,
        'https://tetras.vercel.app',
        /\.vercel\.app$/,
      ],
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

    // Entrar na sala (até 8 jogadores)
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

      // Limita a 8 jogadores por sala
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

      // Broadcast da lista atualizada de jogadores
      broadcastRoomState(roomKey);
    });

    // Atualização de matriz e telemetria do jogador
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

      // Se morreu agora, atribui K.O. ao último atacante
      if (previouslyAlive && !isAlive && player.lastAttackerId && rooms[currentRoomId][player.lastAttackerId]) {
        rooms[currentRoomId][player.lastAttackerId].kos += 1;
      }

      // Broadcast do estado do jogador para os outros
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

      // Se morreu, verifica se a partida acabou (somente 1 sobrevivente)
      if (!isAlive) {
        checkMatchFinished(currentRoomId);
      }
    });

    // Mudança de estratégia ou alvo direto (Targeting)
    socket.on('set_target', ({ targetId, strategy }: { targetId?: string; strategy?: TargetingStrategy }) => {
      if (!currentRoomId || !rooms[currentRoomId] || !rooms[currentRoomId][socket.id]) return;
      const player = rooms[currentRoomId][socket.id];
      if (strategy) player.targetingMode = strategy;
      if (targetId) {
        player.targetId = targetId;
        player.targetingMode = 'manual';
      }
    });

    // Envio de Lixo (Garbage Attack)
    socket.on('send_attack', ({ lines, type }: { lines: number; type: string }) => {
      if (!currentRoomId || !rooms[currentRoomId] || !rooms[currentRoomId][socket.id]) return;
      const room = rooms[currentRoomId];
      const attacker = room[socket.id];
      if (!attacker || !attacker.isAlive || lines <= 0) return;

      // Atualiza linhas enviadas do atacante
      attacker.linesSent += lines;

      // Resolve o alvo conforme a estratégia
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

      // Se quem está saindo/desconectando for o host da sala:
      if (roomHosts[roomKey] === socket.id) {
        console.log(`[Multiplayer] Host ${currentUsername} (${socket.id}) saiu da sala ${roomKey}. Encerrando a sala para todos.`);
        closeRoomAndNotify(roomKey, 'O anfitrião (host) encerrou ou saiu da sala.');
        currentRoomId = null;
        return;
      }

      // Se for outro jogador:
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

    if (mode === 'leader') {
      // Ataca o jogador vivo com maior pontuação
      return candidates.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), candidates[0]);
    }

    if (mode === 'random') {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    }

    // Default: líder
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
      // Partida terminada
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

  server.listen(port, () => {
    console.log(`> [Multiplayer Server] Pronto em http://${hostname}:${port} com Socket.IO (salas de até 8 jogadores)`);
  });
});
