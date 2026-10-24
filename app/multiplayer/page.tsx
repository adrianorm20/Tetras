'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMultiplayer } from '@/lib/tetris/useMultiplayer';
import OpponentMatrixThumbnail from '@/components/OpponentMatrixThumbnail';
import { TargetingStrategy } from '@/lib/tetris/multiplayerTypes';
import {
  Wifi, WifiOff, Users, Target, Swords, Trophy, ArrowLeft,
  Crosshair, Skull, Shield, Zap, Crown
} from 'lucide-react';

// Dynamic import to avoid SSR issues with canvas/socket
const MultiplayerBoard = dynamic(() => import('@/components/MultiplayerBoard'), { ssr: false });

type GamePhase = 'lobby' | 'in_room' | 'finished';

// XP computation (mirrors server logic)
function computeXpForRank(rank: number, score: number, lines: number): number {
  const rankBonus = rank === 1 ? 250 : rank === 2 ? 150 : rank === 3 ? 100 : 50;
  return Math.floor(score / 40) + lines * 15 + rankBonus;
}

export default function MultiplayerPage() {
  const mp = useMultiplayer();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomId, setRoomId] = useState('arena-1');
  const [username, setUsername] = useState('Adriano');
  const [dbResults, setDbResults] = useState<null | { results: { username: string; rank: number; earnedXp: number; newLevel: number }[] }>(null);
  const [savingResults, setSavingResults] = useState(false);

  // Handle entering room
  const handleJoin = useCallback(() => {
    if (!roomId.trim() || !username.trim()) return;
    mp.joinRoom(roomId.trim(), username.trim());
    setPhase('in_room');
    setDbResults(null);
  }, [roomId, username, mp]);

  // Watch for match_finished event
  useEffect(() => {
    if (mp.matchResult && phase === 'in_room') {
      setPhase('finished');
      // Submit results to Neon DB
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
          if (data.success) setDbResults(data);
        })
        .catch(console.error)
        .finally(() => setSavingResults(false));
    }
  }, [mp.matchResult, phase]);

  const handleLeave = useCallback(() => {
    mp.leaveRoom();
    setPhase('lobby');
    setDbResults(null);
  }, [mp]);

  const handleSetStrategy = useCallback((strategy: TargetingStrategy) => {
    mp.setTarget(undefined, strategy);
  }, [mp]);

  const handleSelectTarget = useCallback((id: string) => {
    mp.setTarget(id, undefined);
  }, [mp]);

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-black text-2xl shadow-[0_0_25px_rgba(0,242,254,0.5)]">T</div>
            <h1 className="text-4xl font-black tracking-wider text-white">
              TETR.IO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">MULTIPLAYER</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-mono tracking-widest">ATÉ 8 JOGADORES POR SALA • TEMPO REAL VIA SOCKET.IO</p>
        </div>

        <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 flex flex-col gap-5 shadow-[0_0_40px_rgba(0,242,254,0.1)]">
          <h2 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            ENTRAR EM UMA SALA
          </h2>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold tracking-widest text-slate-500">SEU NOME</label>
            <input
              id="mp-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              placeholder="Adriano"
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_10px_rgba(0,242,254,0.2)] transition placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold tracking-widest text-slate-500">ID DA SALA</label>
            <div className="flex gap-2">
              <input
                id="mp-room-id"
                type="text"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="arena-1"
                className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_10px_rgba(0,242,254,0.2)] transition placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['arena-1', 'arena-2', 'arena-3', 'vip-room'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoomId(r)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition ${roomId === r ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {mp.roomError && (
            <div className="px-3 py-2 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-400 text-xs font-mono">
              ⚠ {mp.roomError}
            </div>
          )}

          <button
            id="btn-join-room"
            onClick={handleJoin}
            disabled={!username.trim() || !roomId.trim()}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.4)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Swords size={16} />
            ENTRAR NA BATALHA
          </button>

          <div className="border-t border-slate-800 pt-4 flex gap-3 justify-center">
            <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition">
              <ArrowLeft size={12} /> Solo
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition">
              <Trophy size={12} /> Leaderboard
            </Link>
          </div>
        </div>

        {/* How to play */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Target size={18} className="text-red-400" />, title: 'Targeting', desc: 'Escolha seu alvo ou use estratégias automáticas' },
            { icon: <Swords size={18} className="text-orange-400" />, title: 'Garbage', desc: 'Tetris e T-Spins enviam linhas para oponentes' },
            { icon: <Trophy size={18} className="text-amber-400" />, title: 'XP & Rank', desc: 'Vitórias dão mais XP no Neon Database' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
              {item.icon}
              <div className="text-[11px] font-black text-white">{item.title}</div>
              <div className="text-[10px] text-slate-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ── RESULTS / PODIUM (Etapa 5) ───────────────────────────────────────────
  if (phase === 'finished' && mp.matchResult) {
    const ranking = mp.matchResult.ranking;
    const winner = mp.matchResult.winner;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden">
        {/* Glow background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Podium Header */}
        <div className="text-center relative z-10 animate-fadeIn">
          <div className="text-6xl mb-2 animate-bounce drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]">🏆</div>
          <h1 className="text-4xl font-black text-white tracking-wider">
            TETR.IO <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">PÓDIO DA ARENA</span>
          </h1>
          <p className="text-slate-400 text-xs font-mono mt-1 tracking-widest uppercase">
            Sala: {mp.matchResult.roomId} • 8 JOGADORES CLASSIFICADOS
          </p>
        </div>

        {/* Top 3 Podium Visual Display */}
        {ranking.length >= 2 && (
          <div className="flex items-end justify-center gap-3 w-full max-w-lg my-2 relative z-10">
            {/* 2nd Place */}
            {ranking[1] && (
              <div className="flex flex-col items-center flex-1 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <span className="text-2xl mb-1">🥈</span>
                <span className="text-xs font-black text-slate-300 truncate max-w-[90px]">{ranking[1].username}</span>
                <span className="text-[10px] font-mono text-slate-400">{ranking[1].score.toLocaleString()} pts</span>
                <div className="w-full h-24 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-xl border-t-2 border-x-2 border-slate-400/50 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(148,163,184,0.2)] mt-2">
                  <span className="text-2xl font-black text-slate-300">2º</span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">+{computeXpForRank(2, ranking[1].score, ranking[1].lines)} XP</span>
                </div>
              </div>
            )}

            {/* 1st Place (Champion) */}
            {ranking[0] && (
              <div className="flex flex-col items-center flex-1 animate-fadeIn -mt-4" style={{ animationDelay: '100ms' }}>
                <Crown size={32} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse mb-1" />
                <span className="text-sm font-black text-amber-300 truncate max-w-[110px]">{ranking[0].username}</span>
                <span className="text-xs font-mono text-amber-200/80">{ranking[0].score.toLocaleString()} pts</span>
                <div className="w-full h-32 bg-gradient-to-t from-amber-950/90 to-amber-500/30 rounded-t-2xl border-t-2 border-x-2 border-amber-400 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.4)] mt-2">
                  <span className="text-4xl font-black text-amber-400">1º</span>
                  <span className="text-[10px] font-mono font-black text-emerald-300">+{computeXpForRank(1, ranking[0].score, ranking[0].lines)} XP</span>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-amber-400/80 mt-1">VITORIOSO</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {ranking[2] && (
              <div className="flex flex-col items-center flex-1 animate-fadeIn" style={{ animationDelay: '300ms' }}>
                <span className="text-2xl mb-1">🥉</span>
                <span className="text-xs font-black text-orange-300 truncate max-w-[90px]">{ranking[2].username}</span>
                <span className="text-[10px] font-mono text-orange-400/80">{ranking[2].score.toLocaleString()} pts</span>
                <div className="w-full h-18 bg-gradient-to-t from-orange-950/70 to-orange-800/50 rounded-t-xl border-t-2 border-x-2 border-orange-500/50 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)] mt-2">
                  <span className="text-2xl font-black text-orange-400">3º</span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">+{computeXpForRank(3, ranking[2].score, ranking[2].lines)} XP</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full 1º to 8º Ranking Panel */}
        <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] relative z-10">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <span className="text-xs font-black tracking-widest text-slate-200">PLACAR FINAL (1º AO 8º LUGAR)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">SALVO NO NEON POSTGRESQL</span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[320px] overflow-y-auto">
            {ranking.map((p, i) => {
              const xp = computeXpForRank(p.rank, p.score, p.lines);
              const dbResult = dbResults?.results?.find(r => r.username === p.username);
              const rankColors = ['text-amber-400 font-black', 'text-slate-300 font-black', 'text-orange-400 font-black'];
              const rankMedals = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º'];

              return (
                <div
                  key={p.username}
                  className={`flex items-center px-4 py-2.5 gap-4 transition-all duration-300 ${
                    p.username === username
                      ? 'bg-cyan-500/10 border-l-4 border-cyan-400 shadow-[inset_0_0_15px_rgba(0,242,254,0.1)]'
                      : 'hover:bg-slate-800/40'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`text-base w-8 text-center ${rankColors[i] || 'text-slate-500 font-mono font-bold'}`}>
                    {rankMedals[i] || `${p.rank}º`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black truncate ${p.username === username ? 'text-cyan-400' : 'text-white'}`}>
                        {p.username}
                      </span>
                      {p.username === username && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          VOCÊ
                        </span>
                      )}
                      {p.won && (
                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          CHAMPION
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {p.score.toLocaleString()} pts • {p.lines} linhas eliminadas
                    </div>
                  </div>

                  <div className="text-right">
                    {savingResults && p.username === username ? (
                      <div className="text-[10px] text-cyan-400 font-mono animate-pulse">Salvando XP...</div>
                    ) : dbResult ? (
                      <div className="flex flex-col items-end">
                        <div className="text-emerald-400 text-xs font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                          +{dbResult.earnedXp} XP
                        </div>
                        <div className="text-slate-400 text-[10px] font-mono">Nível {dbResult.newLevel}</div>
                      </div>
                    ) : (
                      <div className="text-emerald-400 text-xs font-black">+{xp} XP</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <button
            id="btn-play-again"
            onClick={() => { setPhase('lobby'); mp.leaveRoom(); setDbResults(null); }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-pink-500 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_25px_rgba(0,242,254,0.4)] hover:brightness-110 transition flex items-center gap-2"
          >
            <Swords size={16} /> Jogar Novamente
          </button>
          <Link
            href="/leaderboard"
            className="px-6 py-3 bg-slate-800/90 border border-slate-700 text-amber-400 font-black text-sm rounded-xl hover:bg-slate-700 hover:border-amber-500/40 transition flex items-center gap-2 shadow-lg"
          >
            <Trophy size={16} /> Leaderboard Geral
          </Link>
        </div>
      </main>
    );
  }

  // ── IN ROOM ────────────────────────────────────────────────────────────────
  const myId = mp.mySocketId;
  const aliveOpponents = mp.opponents.filter(o => o.isAlive);

  // Compute currently targeted opponent for target lines & crosshair
  const resolvedTarget = (() => {
    if (aliveOpponents.length === 0) return null;
    if (mp.currentStrategy === 'manual' && mp.currentTargetId) {
      return aliveOpponents.find(o => o.id === mp.currentTargetId) || aliveOpponents[0];
    }
    if (mp.currentStrategy === 'leader') {
      return aliveOpponents.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), aliveOpponents[0]);
    }
    if (mp.currentStrategy === 'payback' && mp.lastAttack && mp.lastAttack.toId === myId) {
      const attacker = aliveOpponents.find(o => o.id === mp.lastAttack?.fromId);
      if (attacker) return attacker;
    }
    return aliveOpponents[0];
  })();

  return (
    <main className="min-h-screen flex flex-col p-3 gap-3">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(0,242,254,0.4)]">T</div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white">
              TETR.IO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">MULTIPLAYER</span>
            </h1>
            <div className="text-[9px] font-mono text-slate-500 tracking-widest">SALA: {roomId.toUpperCase()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Targeting strategy selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            <span className="text-[9px] font-mono text-slate-500 px-1">ALVO:</span>
            {([
              { key: 'leader', label: 'Líder', icon: <Crown size={10} /> },
              { key: 'random', label: 'Random', icon: <Zap size={10} /> },
              { key: 'payback', label: 'Revanche', icon: <Shield size={10} /> },
            ] as { key: TargetingStrategy; label: string; icon: React.ReactNode }[]).map(s => (
              <button
                key={s.key}
                id={`btn-strategy-${s.key}`}
                onClick={() => handleSetStrategy(s.key)}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition ${
                  mp.currentStrategy === s.key
                    ? 'bg-red-500/30 border border-red-500/60 text-red-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${mp.isConnected ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400' : 'bg-rose-500/15 border border-rose-500/40 text-rose-400'}`}>
            {mp.isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {mp.isConnected ? `${(mp.roomState?.playerCount || 0)}/8` : 'OFFLINE'}
          </div>

          <button
            id="btn-leave-room"
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-rose-900/30 hover:border-rose-500/40 hover:text-rose-400 transition"
          >
            <ArrowLeft size={11} /> Sair
          </button>
        </div>
      </div>

      {/* Attack notification banner */}
      {mp.lastAttack && (
        <div className={`px-4 py-2 rounded-xl text-xs font-bold font-mono border flex items-center gap-2 transition-all animate-pulse ${
          mp.lastAttack.toId === myId
            ? 'bg-red-500/10 border-red-500/40 text-red-400'
            : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
        }`}>
          <Swords size={13} />
          {mp.lastAttack.toId === myId
            ? `⚠ ${mp.lastAttack.fromUsername} enviou ${mp.lastAttack.lines} linhas de lixo para você! (${mp.lastAttack.type.toUpperCase()})`
            : `${mp.lastAttack.fromUsername} atacou com ${mp.lastAttack.lines}L (${mp.lastAttack.type.toUpperCase()})`}
        </div>
      )}

      {/* Main arena */}
      <div className="relative flex gap-6 items-start justify-center flex-1">
        {/* YOUR BOARD */}
        <div id="player-main-board" className="relative flex flex-col items-center gap-2">
          <MultiplayerBoard multiplayer={mp} username={username} />
        </div>

        {/* OPPONENTS PANEL */}
        {mp.opponents.length > 0 && (
          <div className="flex flex-col gap-3 relative">
            <div className="text-[10px] font-black tracking-widest text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Users size={11} /> OPONENTES ({mp.opponents.length})</span>
              {resolvedTarget && (
                <span className="flex items-center gap-1 text-red-400 font-mono text-[9px] animate-pulse">
                  <Target size={10} /> MIRANDO: {resolvedTarget.username}
                </span>
              )}
            </div>

            {/* Targeting mode indicator */}
            <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300">
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                <Crosshair size={11} />
                {mp.currentStrategy === 'manual' ? 'MANUAL' : mp.currentStrategy.toUpperCase()}
              </span>
              <span className="text-slate-400 text-[9px]">
                {resolvedTarget ? `→ ${resolvedTarget.username}` : 'Buscando alvo...'}
              </span>
            </div>

            {/* Opponent grid */}
            <div className="grid grid-cols-2 gap-2 max-w-[320px] relative">
              {mp.opponents.map(opp => {
                const isCurrentTarget = resolvedTarget?.id === opp.id;
                return (
                  <div key={opp.id} id={`opponent-thumb-${opp.id}`} className="relative">
                    {/* Visual Target Reticle Arrow */}
                    {isCurrentTarget && (
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center">
                        <span className="w-2.5 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                        <span className="w-0 h-0 border-y-4 border-y-transparent border-l-[6px] border-l-red-500 shadow-[0_0_8px_#ef4444]" />
                      </div>
                    )}
                    <OpponentMatrixThumbnail
                      opponent={opp}
                      isTarget={isCurrentTarget}
                      onSelectTarget={handleSelectTarget}
                    />
                  </div>
                );
              })}
            </div>

            {/* Target lines indicator beam at bottom */}
            {resolvedTarget && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 border border-red-500/30 rounded-xl text-[10px] font-mono text-red-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="truncate">Linha de ataque travada em: <strong className="text-white">{resolvedTarget.username}</strong></span>
              </div>
            )}

            {/* Extra: Solo players waiting indicator */}
            {mp.roomState && mp.roomState.playerCount < 2 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-xs text-slate-400 font-mono animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Aguardando outros jogadores...
              </div>
            )}
          </div>
        )}

        {/* Waiting for others */}
        {mp.opponents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <div className="text-sm font-bold text-slate-400">Aguardando oponentes...</div>
            <div className="text-xs font-mono text-slate-500">Sala: {roomId} · Você: {username}</div>
            <div className="text-[10px] text-slate-600 font-mono">Compartilhe o ID da sala com seus amigos</div>
          </div>
        )}
      </div>

      {/* KO scoreboard during match */}
      {mp.opponents.some(o => !o.isAlive) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/70 border border-slate-800 rounded-xl">
          <Skull size={13} className="text-rose-400" />
          <span className="text-[10px] font-black text-slate-400 tracking-widest">ELIMINADOS:</span>
          {mp.opponents.filter(o => !o.isAlive).map(o => (
            <span key={o.id} className="text-[10px] font-mono text-rose-400">{o.username}</span>
          ))}
        </div>
      )}
    </main>
  );
}
