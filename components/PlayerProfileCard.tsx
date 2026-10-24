'use client';

import React from 'react';
import { Trophy, Zap, Shield, User, RefreshCw } from 'lucide-react';
import { PlayerProfile } from '@/lib/db';

interface PlayerProfileCardProps {
  player: PlayerProfile | null;
  progress: {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercent: number;
  } | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function PlayerProfileCard({
  player,
  progress,
  loading = false,
  onRefresh,
}: PlayerProfileCardProps) {
  if (loading && !player) {
    return (
      <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-400 text-xs font-mono">
        <RefreshCw className="animate-spin text-cyan-400" size={14} />
        <span>Carregando dados do Neon Postgres...</span>
      </div>
    );
  }

  if (!player || !progress) return null;

  return (
    <div className="w-full bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* User Info & Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-fuchsia-600 p-[2px] shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <User size={22} className="text-cyan-300" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-fuchsia-500 rounded-md text-[9px] font-black text-slate-950 font-mono shadow">
              LV.{progress.level}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">{player.username}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Neon Sync
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{player.matches_played} partidas</span>
              <span>•</span>
              <span className="text-amber-400">{player.wins} vitórias</span>
            </p>
          </div>
        </div>

        {/* High Score & Quick Stats */}
        <div className="flex items-center gap-4 sm:gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Trophy size={11} className="text-amber-400" />
              RECORD PESSOAL (HIGH SCORE)
            </span>
            <span className="text-lg font-black font-mono text-amber-400 drop-shadow-[0_0_8px_rgba(255,214,10,0.3)]">
              {player.high_score.toLocaleString()}
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 transition disabled:opacity-50"
              title="Atualizar dados do Neon"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs font-mono mb-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Zap size={13} className="text-cyan-400 fill-cyan-400" />
            <span>PROGRESSO DO NÍVEL {progress.level}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-cyan-300 font-bold">{progress.currentLevelXp}</span>
            <span className="text-slate-500"> / </span>
            <span>{progress.nextLevelXp} XP ({progress.progressPercent}%)</span>
          </div>
        </div>

        {/* Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full p-[2px] border border-slate-800 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,242,254,0.5)]"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
