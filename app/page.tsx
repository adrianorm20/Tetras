'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import TetrisBoard from '@/components/TetrisBoard';
import PlayerProfileCard from '@/components/PlayerProfileCard';
import ModeSelection from '@/components/ModeSelection';
import { useAuth } from '@/components/AuthContext';
import { Swords, ArrowLeft, Gamepad2 } from 'lucide-react';

export default function HomePage() {
  const { player, progress, loading, refreshProfile, updateLocalPlayer } = useAuth();
  const [isPlayingSolo, setIsPlayingSolo] = useState(false);

  const handleMatchFinished = async (result: { score: number; lines: number; won?: boolean }) => {
    try {
      const username = player?.username || 'Adriano';
      const res = await fetch('/api/match-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          score: result.score,
          lines: result.lines,
          won: result.won || false,
        }),
      });

      const data = await res.json();
      if (data.success && data.player) {
        updateLocalPlayer(data.player);
        return data;
      }
    } catch (err) {
      console.error('Falha ao registrar término de partida:', err);
    }
    return null;
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-4 px-4 gap-4 max-w-5xl mx-auto">
      {/* Componente Visual de Perfil do Jogador */}
      <PlayerProfileCard
        player={player}
        progress={progress}
        loading={loading}
        onRefresh={refreshProfile}
      />

      {!isPlayingSolo ? (
        /* Painel de Seleção de Modos (Menu Inicial Estilo Arcade) */
        <ModeSelection onStartSolo={() => setIsPlayingSolo(true)} />
      ) : (
        /* Partida Solo Ativa */
        <div className="w-full flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="w-full flex items-center justify-between px-2">
            <button
              onClick={() => setIsPlayingSolo(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao Menu de Modos</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Gamepad2 size={15} />
              <span>MODO SOLO ATIVO</span>
            </div>
          </div>

          <TetrisBoard onMatchEnd={handleMatchFinished} />
        </div>
      )}
    </main>
  );
}
