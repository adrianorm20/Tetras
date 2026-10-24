'use client';

import React, { useEffect, useState, useCallback } from 'react';
import TetrisBoard from '@/components/TetrisBoard';
import PlayerProfileCard from '@/components/PlayerProfileCard';
import { PlayerProfile } from '@/lib/db';

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
