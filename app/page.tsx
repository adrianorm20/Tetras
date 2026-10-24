'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import TetrisBoard from '@/components/TetrisBoard';
import PlayerProfileCard from '@/components/PlayerProfileCard';
import { PlayerProfile } from '@/lib/db';
import { Swords } from 'lucide-react';

export default function HomePage() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<{
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercent: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/player?username=Adriano');
      const data = await res.json();
      if (data.success) {
        setPlayer(data.player);
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('Falha ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleMatchFinished = async (result: { score: number; lines: number; won?: boolean }) => {
    try {
      const res = await fetch('/api/match-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: player?.username || 'Adriano',
          score: result.score,
          lines: result.lines,
          won: result.won || false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPlayer(data.player);
        setProgress(data.progress);
        return data;
      }
    } catch (err) {
      console.error('Falha ao registrar término de partida:', err);
    }
    return null;
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-6 px-4 gap-4 max-w-5xl mx-auto">
      {/* Multiplayer CTA Banner */}
      <Link
        href="/multiplayer"
        className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-fuchsia-600/20 via-cyan-500/10 to-fuchsia-600/20 border border-fuchsia-500/40 rounded-2xl hover:from-fuchsia-600/30 hover:border-fuchsia-400/60 transition shadow-[0_0_20px_rgba(168,85,247,0.15)] group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.5)]">
            <Swords size={15} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wider">MODO MULTIPLAYER</div>
            <div className="text-[10px] font-mono text-fuchsia-400/80">Salas de até 8 jogadores • Socket.IO em tempo real</div>
          </div>
        </div>
        <div className="text-[11px] font-black text-fuchsia-400 group-hover:text-white transition tracking-wider">
          JOGAR →
        </div>
      </Link>

      {/* Componente Visual de Perfil do Jogador (Etapa 2) */}
      <PlayerProfileCard
        player={player}
        progress={progress}
        loading={loading}
        onRefresh={fetchProfile}
      />

      {/* Componente Principal do Motor de Tetris (Etapa 1 + Callback Etapa 2) */}
      <TetrisBoard onMatchEnd={handleMatchFinished} />
    </main>
  );
}

