'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { useMultiplayer } from '@/lib/tetris/useMultiplayer';
import FloorsBoard from '@/components/FloorsBoard';
import { ArrowLeft, Layers, Sparkles, Shield, Wifi, WifiOff } from 'lucide-react';

export default function FloorsPage() {
  const { player, openAuthModal } = useAuth();
  const multiplayer = useMultiplayer();
  const [username, setUsername] = useState('Player');

  useEffect(() => {
    const activeName = player?.username || `Torre_${Math.floor(Math.random() * 8999 + 1000)}`;
    setUsername(activeName);

    // Entrada Direta em Fila Contínua Global (Sem salas fechadas ou convites)
    const CONTINUOUS_GLOBAL_ROOM = 'global-continuous-floors';
    multiplayer.joinRoom(CONTINUOUS_GLOBAL_ROOM, activeName, false);

    return () => {
      multiplayer.leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  return (
    <main className="min-h-screen flex flex-col items-center py-4 px-4 gap-4 max-w-6xl mx-auto">
      {/* Header com Navegação e Status */}
      <div className="w-full flex items-center justify-between px-2 pb-3 border-b border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Menu</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <Layers size={14} className="text-cyan-400 animate-pulse" />
            <span>MODO ANDARES CONTÍNUO</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            {multiplayer.isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi size={13} />
                <span className="hidden sm:inline">Conectado</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 animate-pulse">
                <WifiOff size={13} />
                <span className="hidden sm:inline">Conectando...</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Auth Banner se não estiver logado */}
      {!player && (
        <div className="w-full p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-3 text-xs font-mono text-cyan-200">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-cyan-400 shrink-0" />
            <span>Você está jogando como convidado. Faça login para salvar seus recordes de andar na sua conta!</span>
          </div>
          <button
            onClick={openAuthModal}
            className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold shrink-0 transition"
          >
            Entrar
          </button>
        </div>
      )}

      {/* Tabuleiro Contínuo de Andares */}
      <FloorsBoard multiplayer={multiplayer} username={username} />
    </main>
  );
}
