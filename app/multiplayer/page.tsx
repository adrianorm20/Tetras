'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMultiplayer } from '@/lib/tetris/useMultiplayer';
import OpponentMatrixThumbnail from '@/components/OpponentMatrixThumbnail';
import { TargetingStrategy } from '@/lib/tetris/multiplayerTypes';
import { useAuth } from '@/components/AuthContext';
import {
  Wifi, WifiOff, Users, Target, Swords, Trophy, ArrowLeft,
  Crosshair, Skull, Shield, Zap, Crown, Plus, Key, Globe, Lock, RefreshCw, Check,
  AlertCircle, Sparkles
} from 'lucide-react';

const MultiplayerBoard = dynamic(() => import('@/components/MultiplayerBoard'), { ssr: false });

type GamePhase = 'lobby' | 'in_room' | 'finished';

interface NeonRoom {
  id: string;
  code: string;
  name: string;
  host_name?: string;
  is_public: boolean;
  max_players: number;
  player_count: number;
  status: string;
}

function ConnectionBadge({ isConnected, playerCount }: { isConnected: boolean; playerCount: number | null }) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
        <Wifi size={11} />
        {playerCount !== null ? `${playerCount}/8 online` : 'ONLINE'}
      </div>
    );
  }
  if (playerCount === null) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-400 animate-pulse">
        <WifiOff size={11} />
        CONECTANDO...
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 border border-rose-500/40 text-rose-400">
      <WifiOff size={11} />
      OFFLINE
    </div>
  );
}

function WaitingPanel({
  isConnected,
  roomId,
  username,
  playerCount,
}: {
  isConnected: boolean;
  roomId: string;
  username: string;
  playerCount: number | null;
}) {
  if (!isConnected) {
    const isCloudConfigured = typeof process.env.NEXT_PUBLIC_SOCKET_URL === 'string' && process.env.NEXT_PUBLIC_SOCKET_URL.length > 0;
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/60 border border-amber-500/30 rounded-2xl max-w-sm text-center">
        <WifiOff size={28} className="text-amber-400 animate-pulse" />
        <div className="text-sm font-bold text-amber-300">Conectando ao servidor multiplayer...</div>
        <div className="text-xs font-mono text-slate-400">
          {isCloudConfigured
            ? 'Aguardando resposta do servidor WebSocket na nuvem (pode levar alguns segundos para acordar se estiver em hibernação gratuita)...'
            : 'Para partidas multiplayer online sem o PC ligado, configure a URL do servidor no Render/Railway, ou execute localmente:'}
        </div>
        {!isCloudConfigured && (
          <code className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300">
            npm run dev:multi
          </code>
        )}
        <div className="text-[10px] text-slate-600 font-mono">
          Sala: {roomId} · Jogador: {username}
        </div>
      </div>
    );
  }

  const count = playerCount ?? 1;
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/60 border border-slate-800 rounded-2xl">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-cyan-400">
          {count}
        </div>
      </div>
      <div className="text-sm font-bold text-slate-300">
        {count >= 2 ? 'Oponente pronto! Iniciando combate...' : 'Aguardando oponentes...'}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono text-slate-300">
          <strong className="text-emerald-400">{count}/8</strong> jogadores na sala <strong className="text-cyan-300">{roomId}</strong>
        </span>
      </div>
      {count < 2 && (
        <div className="text-[10px] text-slate-500 font-mono">
          Compartilhe o código da sala com amigos ou aguarde outro jogador entrar
        </div>
      )}
    </div>
  );
}

export default function MultiplayerPage() {
  const { player, updateLocalPlayer } = useAuth();
  const mp = useMultiplayer();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomId, setRoomId] = useState('arena-1');
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState(player?.username || 'Adriano');
  const [dbResults, setDbResults] = useState<null | { results: { username: string; rank: number; earnedXp: number; newLevel: number }[] }>(null);
  const [savingResults, setSavingResults] = useState(false);

  // Neon Rooms state
  const [publicRooms, setPublicRooms] = useState<NeonRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isNewRoomPublic, setIsNewRoomPublic] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const [isCurrentHost, setIsCurrentHost] = useState(false);

  // Sync auth username
  useEffect(() => {
    if (player?.username) {
      setUsername(player.username);
    }
  }, [player]);

  // Fetch Public Rooms from Neon
  const fetchRooms = useCallback(async () => {
    try {
      setIsLoadingRooms(true);
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success && data.rooms) {
        setPublicRooms(data.rooms);
      }
    } catch (err) {
      console.error('Erro ao buscar salas públicas:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Se a sala for fechada pelo host, retorna ao lobby automaticamente
  useEffect(() => {
    if (mp.roomClosedMessage) {
      setPhase('lobby');
      setIsCurrentHost(false);
      setDbResults(null);
      fetchRooms();
    }
  }, [mp.roomClosedMessage, fetchRooms]);

  // Create Room in Neon
  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim() || `Arena de ${username}`,
          is_public: isNewRoomPublic,
          max_players: 8,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setRoomId(data.room.code);
        setRoomCode(data.room.code);
        setIsCurrentHost(true);
        mp.joinRoom(data.room.code, username, true);
        setPhase('in_room');
        setDbResults(null);
      }
    } catch (err) {
      console.error('Erro ao criar sala:', err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join by 6-char Code
  const handleJoinByCode = async () => {
    setCodeError(null);
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) return;

    try {
      const res = await fetch(`/api/rooms/${clean}`);
      const data = await res.json();
      if (data.success && data.room) {
        setRoomId(data.room.code);
        setRoomCode(data.room.code);
        setIsCurrentHost(false);
        mp.joinRoom(data.room.code, username, false);
        setPhase('in_room');
        setDbResults(null);
      } else {
        setCodeError(data.error || 'Código de sala inválido ou inexistente.');
      }
    } catch (err) {
      setCodeError('Erro ao consultar sala no servidor.');
    }
  };

  // Direct join
  const handleJoin = useCallback((targetRoom: string) => {
    if (!targetRoom.trim() || !username.trim()) return;
    setRoomId(targetRoom);
    setIsCurrentHost(false);
    mp.joinRoom(targetRoom.trim(), username.trim(), false);
    setPhase('in_room');
    setDbResults(null);
  }, [username, mp]);

  // Watch for match_finished event
  useEffect(() => {
    if (mp.matchResult && phase === 'in_room') {
      setPhase('finished');
      const ranking = mp.matchResult.ranking;
      setSavingResults(true);
      fetch('/api/multiplayer-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: mp.matchResult.roomId,
          participants: ranking.map(p => ({
            username: p.username,
            rank: p.rank,
            score: p.score,
            lines: p.lines,
            won: p.won,
          })),
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setDbResults(data);
            // Atualiza dados locais se o usuário estiver participando
            if (player) {
              const myResult = data.results?.find((r: { username: string }) => r.username === player.username);
              if (myResult) {
                updateLocalPlayer({
                  ...player,
                  xp: player.xp + (myResult.earnedXp || 0),
                  level: myResult.newLevel || player.level,
                  matches_played: player.matches_played + 1,
                  wins: myResult.rank === 1 ? player.wins + 1 : player.wins,
                });
              }
            }
          }
        })
        .catch(console.error)
        .finally(() => setSavingResults(false));
    }
  }, [mp.matchResult, phase, player, updateLocalPlayer]);

  const handleLeave = useCallback(async () => {
    // Se for o host, encerra e remove a sala no Neon imediatamente
    if (isCurrentHost && roomId) {
      try {
        await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Erro ao deletar sala no Neon ao sair:', e);
      }
    }
    mp.leaveRoom();
    setIsCurrentHost(false);
    setPhase('lobby');
    setDbResults(null);
    fetchRooms();
  }, [isCurrentHost, roomId, mp, fetchRooms]);

  const handleSetStrategy = useCallback((strategy: TargetingStrategy) => {
    mp.setTarget(undefined, strategy);
  }, [mp]);

  const handleSelectTarget = useCallback((id: string) => {
    mp.setTarget(id, undefined);
  }, [mp]);

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-start py-8 px-4 gap-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(0,242,254,0.4)]">
              T
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-white">
              TETRAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">MULTIPLAYER</span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase">
            Salas Públicas & Privadas • Até 8 Jogadores
          </p>
        </div>

        {/* User Nick Input */}
        <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Seu Nick:</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Servidor Online</span>
          </div>
        </div>

        {/* Lobby Panels Grid: Create Room & Private Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Create Room Panel */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-fuchsia-500/30 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
                <Plus size={18} />
              </div>
              <h3 className="text-sm font-black text-white tracking-wider">CRIAR NOVA SALA</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Nome da Arena</label>
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder={`Arena de ${username}`}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-fuchsia-400 transition"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                {isNewRoomPublic ? <Globe size={15} className="text-cyan-400" /> : <Lock size={15} className="text-amber-400" />}
                <span className="text-xs font-mono text-slate-300">
                  {isNewRoomPublic ? 'Sala Pública (Lista Aberta)' : 'Sala Privada (Apenas Código)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRoomPublic(!isNewRoomPublic)}
                className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition ${
                  isNewRoomPublic ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {isNewRoomPublic ? 'Pública' : 'Privada'}
              </button>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreatingRoom}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:brightness-110 transition disabled:opacity-50"
            >
              {isCreatingRoom ? 'Criando Sala...' : 'Gerar Sala & Iniciar'}
            </button>
          </div>

          {/* Join by Code Panel */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Key size={18} />
              </div>
              <h3 className="text-sm font-black text-white tracking-wider">ENTRAR POR CÓDIGO (6 DÍGITOS)</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Código de Convite</label>
              <input
                type="text"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="EX: ABC123"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold tracking-widest text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition uppercase"
              />
            </div>

            {codeError && (
              <div className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                {codeError}
              </div>
            )}

            <button
              onClick={handleJoinByCode}
              disabled={joinCodeInput.trim().length !== 6}
              className="w-full py-3 mt-auto rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:brightness-110 transition disabled:opacity-50"
            >
              Conectar à Sala Privada
            </button>
          </div>
        </div>

        {/* Notificação se a sala foi fechada pelo host */}
        {mp.roomClosedMessage && (
          <div className="w-full max-w-4xl bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between text-rose-300 text-xs font-mono animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{mp.roomClosedMessage}</span>
            </div>
            <button
              onClick={mp.clearRoomClosedMessage}
              className="text-rose-400/80 hover:text-rose-200 transition text-sm font-bold ml-4 px-2.5 py-1 rounded-lg bg-rose-500/20"
            >
              OK
            </button>
          </div>
        )}

        {/* Public Rooms List from Neon */}
        <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className="text-cyan-400" />
              <h3 className="text-sm font-black text-white tracking-wider">SALAS PÚBLICAS DISPONÍVEIS</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                {publicRooms.length} {publicRooms.length === 1 ? 'ativa' : 'ativas'}
              </span>
            </div>
            <button
              onClick={fetchRooms}
              disabled={isLoadingRooms}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-mono px-2.5"
              title="Atualizar lista"
            >
              <RefreshCw size={13} className={isLoadingRooms ? 'animate-spin text-cyan-400' : ''} />
              <span className="hidden sm:inline text-[11px]">Atualizar</span>
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800/80 flex flex-col items-center justify-center text-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-1">
                <Sparkles size={18} className="text-cyan-400/80" />
              </div>
              <p className="text-xs font-bold text-slate-300 font-mono tracking-wider">
                NENHUMA SALA ABERTA NO MOMENTO
              </p>
              <p className="text-[11px] text-slate-500 max-w-md">
                Crie sua própria arena personalizada no card acima para que outros jogadores possam entrar e disputar com você!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicRooms.map(room => (
                <div
                  key={room.id}
                  className="p-4 bg-slate-950/70 border border-slate-800/80 hover:border-fuchsia-500/50 rounded-2xl flex flex-col justify-between gap-3 transition-all duration-200 group hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-white truncate max-w-[140px]" title={room.name}>
                        {room.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                        {room.code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="truncate max-w-[120px]">
                        Host: <strong className="text-slate-300">{room.host_name || 'Desconhecido'}</strong>
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {room.player_count || 1}/8 jogadores
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(room.code)}
                    className="w-full py-2.5 rounded-xl bg-slate-800/90 group-hover:bg-gradient-to-r group-hover:from-fuchsia-500 group-hover:to-cyan-400 text-slate-300 group-hover:text-slate-950 font-bold text-xs font-mono transition-all duration-200 shadow-sm"
                  >
                    Entrar na Sala ({room.code}) →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── IN ROOM / MULTIPLAYER GAME ─────────────────────────────────────────────
  if (phase === 'in_room') {
    const oppCount = mp.opponents.length;
    const isHost = isCurrentHost; // Permissão real de host da sala
    return (
      <main className="min-h-screen flex flex-col items-center justify-start py-4 px-3 gap-3 max-w-7xl mx-auto">
        {/* Top Bar Navigation */}
        <div className="w-full flex items-center justify-between px-2">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-mono transition"
            title={isHost ? 'Como host, sair encerrará a sala para todos os participantes' : 'Sair da sala'}
          >
            <ArrowLeft size={14} />
            <span>{isHost ? 'Encerrar Sala (Host)' : 'Sair da Sala'}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
              <span className="text-slate-500">SALA:</span>
              <span className="text-cyan-300 font-bold">{roomId}</span>
              {isHost && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  HOST
                </span>
              )}
            </div>
            <ConnectionBadge isConnected={mp.isConnected} playerCount={mp.roomState?.playerCount ?? null} />
          </div>
        </div>

        {/* Waiting Panel or Game Arena */}
        {oppCount === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-6">
            <WaitingPanel
              isConnected={mp.isConnected}
              roomId={roomId}
              username={username}
              playerCount={mp.roomState?.playerCount ?? null}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 mt-2">
            {/* Main Player Canvas */}
            <div className="flex flex-col items-center gap-3">
              <MultiplayerBoard
                username={username}
                multiplayer={mp}
              />
            </div>

            {/* Opponents Mini-Canvases Grid & Targeting */}
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crosshair size={16} className="text-red-400" />
                    <span className="text-xs font-black text-white tracking-wider">ESTRATÉGIA DE ALVO</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{oppCount} oponentes</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['leader', 'random', 'manual'] as TargetingStrategy[]).map(strat => (
                    <button
                      key={strat}
                      onClick={() => handleSetStrategy(strat)}
                      className={`py-2 px-2 text-[10px] font-mono font-bold rounded-xl border transition uppercase ${
                        mp.currentStrategy === strat
                          ? 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {strat === 'leader' ? 'Líder' : strat === 'random' ? 'Aleatório' : 'Manual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="text-xs font-black text-slate-400 tracking-wider">OPONENTES NA ARENA</div>
                <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {mp.opponents.map(opp => (
                    <div
                      key={opp.id}
                      className="cursor-pointer transition rounded-xl"
                    >
                      <OpponentMatrixThumbnail
                        opponent={opp}
                        isTarget={mp.currentTargetId === opp.id}
                        onSelectTarget={handleSelectTarget}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ── RESULTS / ENRICHED PODIUM ─────────────────────────────────────────────
  if (phase === 'finished' && mp.matchResult) {
    const ranking = mp.matchResult.ranking;
    const winner = mp.matchResult.winner || ranking[0];

    return (
      <main className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 gap-6 relative max-w-4xl mx-auto animate-fadeIn">
        {/* Confetti / Glow Header */}
        <div className="text-center relative">
          <div className="inline-flex p-3 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-[0_0_30px_rgba(255,214,10,0.35)] animate-bounce">
            <Trophy size={42} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider">
            PÓDIO DA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400">ARENA</span>
          </h1>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">
            Sala: <span className="text-cyan-400">{mp.matchResult.roomId}</span> • Classificação Final da Partida
          </p>
        </div>

        {/* 1º Lugar - Campeão em Destaque Maior */}
        {winner && (
          <div className="w-full bg-gradient-to-b from-amber-500/20 via-slate-900/95 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(255,214,10,0.35)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            {/* Background glowing particles/shine */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-5 z-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-[0_0_25px_rgba(255,214,10,0.6)]">
                  <Crown size={40} className="text-slate-950" />
                </div>
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-xs font-mono shadow">
                  #1
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide drop-shadow-[0_0_12px_rgba(255,214,10,0.6)]">
                    {winner.username}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-widest">
                    Vencedor
                  </span>
                </div>
                <div className="text-sm font-mono text-slate-300 mt-1">
                  Pontuação Final: <strong className="text-amber-400 font-bold">{winner.score.toLocaleString()} PTS</strong>
                </div>
              </div>
            </div>

            {/* Winner Stats highlight grid */}
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto z-10">
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-3 text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-amber-300/80">LINHAS ENV.</div>
                <div className="text-lg font-black font-mono text-amber-300 mt-0.5">+{winner.linesSent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-3 text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-amber-300/80">K.O.s</div>
                <div className="text-lg font-black font-mono text-rose-400 mt-0.5">⚔️ {winner.kos ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-3 text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-amber-300/80">XP GANHO</div>
                <div className="text-lg font-black font-mono text-cyan-300 mt-0.5">
                  +{dbResults?.results?.find(r => r.username === winner.username)?.earnedXp ?? (Math.floor(winner.score / 40) + 250)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista Completa de Classificação (1º ao 8º) com Estatísticas Detalhadas */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Classificação Completa</span>
            {savingResults && (
              <span className="flex items-center gap-1.5 text-cyan-400 text-[11px]">
                <RefreshCw size={12} className="animate-spin" />
                Salvando resultados...
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {ranking.map((p, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;
              const earnedXp = dbResults?.results?.find(r => r.username === p.username)?.earnedXp;

              return (
                <div
                  key={p.username}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition ${
                    isFirst
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(255,214,10,0.15)]'
                      : isSecond
                      ? 'bg-slate-800/40 border-slate-600/60'
                      : isThird
                      ? 'bg-amber-950/20 border-amber-700/50'
                      : 'bg-slate-950/60 border-slate-800/70'
                  }`}
                >
                  {/* Posição e Nome */}
                  <div className="flex items-center gap-3.5 mb-2 sm:mb-0">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                        isFirst
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(255,214,10,0.5)]'
                          : isSecond
                          ? 'bg-slate-300 text-slate-950'
                          : isThird
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{p.username}</span>
                        {p.username === username && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                            VOCÊ
                          </span>
                        )}
                        {isFirst && <Crown size={15} className="text-amber-400 inline" />}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {p.score.toLocaleString()} pts • {p.lines} linhas limpas
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas Detalhadas: Enviadas, Recebidas, KOs e XP */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center font-mono text-xs">
                    {/* Linhas Enviadas */}
                    <div className="bg-slate-900/80 sm:bg-transparent rounded-lg p-1.5 sm:p-0">
                      <div className="text-[9px] text-slate-500 uppercase">Enviadas</div>
                      <div className="font-bold text-amber-400">+{p.linesSent ?? 0}L</div>
                    </div>

                    {/* Linhas Recebidas */}
                    <div className="bg-slate-900/80 sm:bg-transparent rounded-lg p-1.5 sm:p-0">
                      <div className="text-[9px] text-slate-500 uppercase">Recebidas</div>
                      <div className="font-bold text-rose-400">-{p.linesReceived ?? 0}L</div>
                    </div>

                    {/* K.O.s Eliminados */}
                    <div className="bg-slate-900/80 sm:bg-transparent rounded-lg p-1.5 sm:p-0">
                      <div className="text-[9px] text-slate-500 uppercase">K.O.s</div>
                      <div className="font-bold text-slate-200">⚔️ {p.kos ?? 0}</div>
                    </div>

                    {/* XP Ganho */}
                    <div className="bg-slate-900/80 sm:bg-transparent rounded-lg p-1.5 sm:p-0">
                      <div className="text-[9px] text-slate-500 uppercase">XP Ganho</div>
                      <div className="font-bold text-cyan-300">
                        +{earnedXp ?? (Math.floor(p.score / 40) + p.lines * 15 + (isFirst ? 250 : isSecond ? 150 : 50))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleLeave}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <span>Voltar ao Lobby Multiplayer</span>
          </button>
        </div>
      </main>
    );
  }

  return null;
}
