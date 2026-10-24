'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Trophy, Award, ArrowLeft, RefreshCw, Zap, Flame, User, Gamepad2, Shield } from 'lucide-react';
import { PlayerProfile } from '@/lib/db';
import { useAuth } from '@/components/AuthContext';

type TabType = 'scores' | 'levels';

export default function LeaderboardView() {
  const { player: currentPlayer } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scores');
  const [topScores, setTopScores] = useState<PlayerProfile[]>([]);
  const [topLevels, setTopLevels] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLeaderboards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      if (json.success && json.data) {
        setTopScores(json.data.topScores || []);
        setTopLevels(json.data.topLevels || []);
        setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      }
    } catch (err) {
      console.error('Falha ao carregar leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const activeList = activeTab === 'scores' ? topScores : topLevels;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 transition flex items-center justify-center shadow"
            title="Voltar ao Jogo"
          >
            <ArrowLeft size={18} className="text-cyan-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
                PLACAR <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400">GLOBAL</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                Neon Postgres
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              HALL DA FAMA // TETR.IO ADRIANO LEADERBOARD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-500">
              Atualizado: <strong className="text-slate-300">{lastUpdated}</strong>
            </span>
          )}
          <button
            onClick={fetchLeaderboards}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('scores')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold transition tracking-wide ${
            activeTab === 'scores'
              ? 'bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(255,214,10,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Trophy size={16} className={activeTab === 'scores' ? 'text-amber-400' : 'text-slate-500'} />
          <span>TOP 10 MAIORES PONTUAÇÕES (HIGH SCORES)</span>
        </button>

        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold transition tracking-wide ${
            activeTab === 'levels'
              ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Award size={16} className={activeTab === 'levels' ? 'text-cyan-400' : 'text-slate-500'} />
          <span>TOP 10 MAIORES NÍVEIS DE CONTA</span>
        </button>
      </div>

      {/* Podium Top 3 (Se houver pelo menos 3) */}
      {!loading && activeList.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* #2 Prata */}
          <div className="order-2 sm:order-1 bg-slate-900/75 border border-slate-800/90 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-lg mt-0 sm:mt-4">
            <div className="absolute top-2 left-3 text-2xl font-black font-mono text-slate-400">#2</div>
            <div className="w-12 h-12 rounded-xl bg-slate-400/20 border border-slate-400 flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(148,163,184,0.3)]">
              <Award size={24} className="text-slate-300" />
            </div>
            <div className="font-extrabold text-white text-base truncate max-w-[150px]">{activeList[1].username}</div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              {activeTab === 'scores' ? (
                <span className="text-slate-200 font-bold text-sm">{activeList[1].high_score.toLocaleString()} PTS</span>
              ) : (
                <span className="text-slate-200 font-bold text-sm">LV.{activeList[1].level} ({activeList[1].xp.toLocaleString()} XP)</span>
              )}
            </div>
          </div>

          {/* #1 Ouro */}
          <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_25px_rgba(255,214,10,0.25)] scale-100 sm:scale-105 z-10">
            <div className="absolute top-2 left-3 text-3xl font-black font-mono text-amber-400">#1</div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(255,214,10,0.5)]">
              <Trophy size={32} className="text-slate-950" />
            </div>
            <div className="font-black text-amber-300 text-lg truncate max-w-[170px]">{activeList[0].username}</div>
            <div className="text-xs font-mono text-amber-400/90 mt-1">
              {activeTab === 'scores' ? (
                <span className="text-xl font-black font-mono text-amber-300 drop-shadow-[0_0_10px_rgba(255,214,10,0.5)]">
                  {activeList[0].high_score.toLocaleString()} PTS
                </span>
              ) : (
                <span className="text-xl font-black font-mono text-cyan-300 drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]">
                  LV.{activeList[0].level} ({activeList[0].xp.toLocaleString()} XP)
                </span>
              )}
            </div>
            <span className="mt-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold tracking-wider border border-amber-500/30">
              CHAMPION
            </span>
          </div>

          {/* #3 Bronze */}
          <div className="order-3 bg-slate-900/75 border border-slate-800/90 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-lg mt-0 sm:mt-6">
            <div className="absolute top-2 left-3 text-2xl font-black font-mono text-amber-600">#3</div>
            <div className="w-12 h-12 rounded-xl bg-amber-700/20 border border-amber-600 flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(217,119,6,0.3)]">
              <Flame size={24} className="text-amber-500" />
            </div>
            <div className="font-extrabold text-white text-base truncate max-w-[150px]">{activeList[2].username}</div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              {activeTab === 'scores' ? (
                <span className="text-amber-500 font-bold text-sm">{activeList[2].high_score.toLocaleString()} PTS</span>
              ) : (
                <span className="text-amber-500 font-bold text-sm">LV.{activeList[2].level} ({activeList[2].xp.toLocaleString()} XP)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">POS</th>
                <th className="py-3.5 px-4">JOGADOR</th>
                {activeTab === 'scores' ? (
                  <>
                    <th className="py-3.5 px-4 text-right">HIGH SCORE</th>
                    <th className="py-3.5 px-4 text-center">NÍVEL</th>
                    <th className="py-3.5 px-4 text-center">PARTIDAS</th>
                    <th className="py-3.5 px-4 text-center">VITÓRIAS</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-4 text-center">NÍVEL</th>
                    <th className="py-3.5 px-4 text-right">TOTAL XP</th>
                    <th className="py-3.5 px-4 text-right">HIGH SCORE</th>
                    <th className="py-3.5 px-4 text-center">PARTIDAS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-cyan-400" size={16} />
                      <span>Carregando dados da tabela no Neon Postgres...</span>
                    </div>
                  </td>
                </tr>
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum jogador classificado no momento.
                  </td>
                </tr>
              ) : (
                activeList.map((player, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;
                  const isMe = currentPlayer?.username?.toLowerCase() === player.username.toLowerCase();

                  return (
                    <tr
                      key={player.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMe ? 'bg-cyan-950/30 border-l-4 border-l-cyan-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {isTop1 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                            #1
                          </span>
                        ) : isTop2 ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-400/20 text-slate-200 font-black border border-slate-400/40">
                            #2
                          </span>
                        ) : isTop3 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-700/20 text-amber-500 font-black border border-amber-700/40">
                            #3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                            <User size={13} />
                          </div>
                          <div>
                            <span className={`font-bold text-sm ${isMe ? 'text-cyan-300' : 'text-slate-100'}`}>
                              {player.username}
                            </span>
                            {isMe && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                                VOCÊ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {activeTab === 'scores' ? (
                        <>
                          <td className="py-3.5 px-4 text-right font-black text-sm text-amber-400 drop-shadow-[0_0_8px_rgba(255,214,10,0.3)]">
                            {player.high_score.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 font-bold">
                              LV.{player.level}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400">
                            {player.matches_played}
                          </td>
                          <td className="py-3.5 px-4 text-center text-emerald-400 font-semibold">
                            {player.wins}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black text-xs shadow-[0_0_8px_rgba(0,242,254,0.3)]">
                              LV.{player.level}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-fuchsia-400">
                            {player.xp.toLocaleString()} XP
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-400 font-semibold">
                            {player.high_score.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400">
                            {player.matches_played}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
