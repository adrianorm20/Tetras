'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { Swords, User, LogIn, LogOut, Trophy, Sparkles } from 'lucide-react';

export default function AppNavbar() {
  const { player, progress, openAuthModal, logout } = useAuth();

  return (
    <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4 px-4 border-b border-slate-800/80 mb-4">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-fuchsia-500 p-[2px] shadow-[0_0_15px_rgba(0,242,254,0.4)] group-hover:scale-105 transition">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-xs text-cyan-300">
            T
          </div>
        </div>
        <div>
          <span className="text-sm font-black text-white tracking-widest block font-mono">
            TETR.IO <span className="text-cyan-400">ADRIANO</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500 block">
            Competitive Engine • Neon DB
          </span>
        </div>
      </Link>

      {/* Nav Links & User Status */}
      <div className="flex items-center gap-3">
        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition"
        >
          <Trophy size={13} className="text-amber-400" />
          <span className="hidden sm:inline">Ranking</span>
        </Link>

        <Link
          href="/multiplayer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-fuchsia-300 hover:text-white bg-fuchsia-950/30 hover:bg-fuchsia-900/40 border border-fuchsia-500/40 transition"
        >
          <Swords size={13} className="text-fuchsia-400" />
          <span className="hidden sm:inline">Multiplayer</span>
        </Link>

        {player ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {player.username}
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                Nível {progress?.level || player.level}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sair da Conta"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:brightness-110 transition"
          >
            <LogIn size={13} />
            <span>Login / Criar</span>
          </button>
        )}
      </div>
    </header>
  );
}
