'use client';

import React, { useRef, useEffect } from 'react';
import { OpponentState } from '@/lib/tetris/multiplayerTypes';
import { PIECES } from '@/lib/tetris/constants';
import { Crosshair, Skull, ShieldAlert } from 'lucide-react';

interface OpponentMatrixThumbnailProps {
  opponent: OpponentState;
  isTarget: boolean;
  onSelectTarget: (id: string) => void;
}

const MINI_COL_SIZE = 7; // 70px x 140px

export default function OpponentMatrixThumbnail({
  opponent,
  isTarget,
  onSelectTarget,
}: OpponentMatrixThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo da miniatura
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas da matriz
    const matrix = opponent.matrix;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = matrix && matrix[r] ? matrix[r][c] : 0;
        if (cell !== 0) {
          const color = cell === 'G' ? '#64748b' : PIECES[cell]?.color || '#00f2fe';
          ctx.fillStyle = color;
          ctx.fillRect(c * MINI_COL_SIZE + 0.5, r * MINI_COL_SIZE + 0.5, MINI_COL_SIZE - 1, MINI_COL_SIZE - 1);
        }
      }
    }
  }, [opponent.matrix]);

  return (
    <div
      onClick={() => onSelectTarget(opponent.id)}
      className={`relative cursor-pointer transition-all duration-200 rounded-xl p-1.5 flex flex-col items-center bg-slate-900/80 border ${
        isTarget
          ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105 bg-red-950/20'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
      } ${!opponent.isAlive ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Alvo Ativo Badge */}
      {isTarget && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md animate-bounce">
          <Crosshair size={12} />
        </div>
      )}

      {/* Nome e Nível */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono mb-1 px-1">
        <span className="font-bold text-slate-200 truncate max-w-[65px]">{opponent.username}</span>
        {opponent.incomingGarbage > 0 && (
          <span className="flex items-center gap-0.5 text-red-400 font-bold" title="Lixo pendente">
            <ShieldAlert size={10} />
            <span>+{opponent.incomingGarbage}</span>
          </span>
        )}
      </div>

      {/* Miniatura Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800/80">
        <canvas ref={canvasRef} width={70} height={140} className="block transition-all duration-700" />
        {!opponent.isAlive && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-rose-500 animate-fadeIn">
            {/* KO Explosion burst particles effect */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="w-12 h-12 rounded-full bg-rose-500/20 animate-ping absolute" />
              <span className="w-8 h-8 rounded-full bg-orange-500/30 animate-pulse absolute" />
            </div>
            <Skull size={22} className="relative z-10 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-bounce" />
            <span className="relative z-10 text-[10px] font-mono font-black text-rose-400 tracking-wider mt-1">K.O.</span>
            <span className="relative z-10 text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 mt-1 uppercase tracking-widest">
              SPECTATOR
            </span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="text-[9px] font-mono text-slate-400 mt-1">
        {opponent.isAlive ? `${opponent.score.toLocaleString()} pts` : <span className="text-slate-500">ESPECTADOR</span>}
      </div>
    </div>
  );
}
