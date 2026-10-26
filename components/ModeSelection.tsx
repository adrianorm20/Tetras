'use client';

import React from 'react';
import Link from 'next/link';
import { Gamepad2, Swords, Trophy, Play, Users, Sparkles, Shield, Flame } from 'lucide-react';
import { useAuth } from './AuthContext';

interface ModeSelectionProps {
  onStartSolo: () => void;
}

export default function ModeSelection({ onStartSolo }: ModeSelectionProps) {
  const { player, progress, openAuthModal } = useAuth();

  return (
    <div className="w-full flex flex-col items-center justify-center py-8 px-4 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Title Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest mb-6">
        <Sparkles size={14} className="animate-spin text-cyan-300" />
        <span>Selecione o Modo de Jogo</span>
      </div>

      {/* Main Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* Solo Mode Card */}
        <div className="group relative bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 flex flex-col justify-between hover:border-cyan-400/80 hover:shadow-[0_0_35px_rgba(0,242,254,0.25)] transition duration-300 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.4)] mb-5 group-hover:scale-105 transition">
              <Gamepad2 size={28} className="text-slate-950" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white tracking-wider">MODO SOLO</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                RANKED
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
              Enfrente a gravidade progressiva, execute T-Spins SRS e suba no ranking global. Cada partida salva seu XP e High Score diretamente na sua conta.
            </p>

            <div className="flex flex-col gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gravidade:</span>
                <span className="text-cyan-400 font-bold">Progressiva (Níveis 1-20+)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lock Delay:</span>
                <span className="text-cyan-400 font-bold">500ms c/ Reset</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Seu High Score:</span>
                <span className="text-amber-400 font-bold">
                  {player?.high_score ? player.high_score.toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartSolo}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] transition"
          >
            <Play size={16} className="fill-slate-950" />
            <span>Iniciar Partida Solo</span>
          </button>
        </div>

        {/* Endless Floors Mode Card */}
        <div className="group relative bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-400/80 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] transition duration-300 overflow-hidden ring-1 ring-emerald-500/30">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-5 group-hover:scale-105 transition">
              <Flame size={28} className="text-slate-950" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white tracking-wider">TORRE ANDARES</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                NOVO MODO
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
              Multiplayer contínuo sem salas fechadas. Barra de Vida estilo TFT (100 a 0) e velocidade que escala a cada andar alcançado.
            </p>

            <div className="flex flex-col gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Entrada:</span>
                <span className="text-emerald-400 font-bold">Fila Direta Global</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sistema de HP:</span>
                <span className="text-emerald-400 font-bold">100 a 0 estilo TFT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dificuldade:</span>
                <span className="text-amber-400 font-bold">Gravidade por Andar</span>
              </div>
            </div>
          </div>

          <Link
            href="/floors"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition text-center"
          >
            <Sparkles size={16} />
            <span>Subir na Torre</span>
          </Link>
        </div>

        {/* Multiplayer Standard Mode Card */}
        <div className="group relative bg-slate-900/80 backdrop-blur-md border border-fuchsia-500/30 rounded-3xl p-6 flex flex-col justify-between hover:border-fuchsia-400/80 hover:shadow-[0_0_35px_rgba(217,70,239,0.25)] transition duration-300 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-400 to-pink-600 flex items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.4)] mb-5 group-hover:scale-105 transition">
              <Swords size={28} className="text-slate-950" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white tracking-wider">MULTIPLAYER</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                SALAS / PVP
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
              Batalha de sobrevivência com Garbage Attacks em tempo real, salas públicas e privadas por código de 6 dígitos. Lixo bloqueável com combos.
            </p>

            <div className="flex flex-col gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Salas:</span>
                <span className="text-fuchsia-400 font-bold">Públicas & Códigos Privados</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mecânica:</span>
                <span className="text-fuchsia-400 font-bold">Garbage Queue & Cancelling</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vitórias:</span>
                <span className="text-amber-400 font-bold">{player?.wins || 0}</span>
              </div>
            </div>
          </div>

          <Link
            href="/multiplayer"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 hover:brightness-110 text-slate-950 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(217,70,239,0.4)] transition text-center"
          >
            <Users size={16} />
            <span>Entrar no Lobby</span>
          </Link>
        </div>
      </div>

      {/* Auth Prompt Banner if not logged */}
      {!player && (
        <div className="w-full max-w-3xl mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-cyan-400 shrink-0" />
            <div className="text-xs font-mono text-slate-300">
              Faça login para salvar seus records, nível e disputar o ranking global!
            </div>
          </div>
          <button
            onClick={openAuthModal}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold font-mono transition shrink-0"
          >
            Entrar / Cadastrar
          </button>
        </div>
      )}
    </div>
  );
}
