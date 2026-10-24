'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TetrisEngine } from '@/lib/tetris/engine';
import { TetrisState, PieceType } from '@/lib/tetris/types';
import { COLS, ROWS, PIECES } from '@/lib/tetris/constants';
import { audio } from '@/components/AudioPlayer';
import { UseMultiplayerReturn } from '@/lib/tetris/useMultiplayer';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

const BLOCK_SIZE = 26;
const MINI_BLOCK_SIZE = 18;

interface MultiplayerBoardProps {
  multiplayer: UseMultiplayerReturn;
  username: string;
}

export default function MultiplayerBoard({ multiplayer, username }: MultiplayerBoardProps) {
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<TetrisEngine | null>(null);
  const [gameState, setGameState] = useState<TetrisState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionText, setActionText] = useState<string | null>(null);
  const matchProcessedRef = useRef(false);

  // Garbage warning flash state & countdown timer
  const [garbageFlash, setGarbageFlash] = useState(false);
  const [garbageQueue, setGarbageQueue] = useState<{ lines: number; countdown: number }[]>([]);
  const pendingGarbageRef = useRef(0);

  // Line flash animation state & floating particles
  const [clearedRowsFlash, setClearedRowsFlash] = useState<number[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }[]>([]);

  // Key state tracking for smooth DAS/ARR and soft drop timer
  const keyStateRef = useRef({ left: false, right: false, down: false, dasTimer: 0, arrTimer: 0, softDropTimer: 0 });
  const DAS_DELAY = 140;
  const ARR_RATE = 30;
  const SOFT_DROP_RATE = 40; // ms por drop fluido

  // Sync incoming garbage from server to engine with countdown delay (defense window)
  useEffect(() => {
    if (multiplayer.incomingGarbage > 0) {
      const addedLines = multiplayer.incomingGarbage;
      multiplayer.consumeGarbage();

      setGarbageFlash(true);
      setTimeout(() => setGarbageFlash(false), 800);

      // Add to garbage queue with 2.5s defense grace period
      setGarbageQueue(prev => [...prev, { lines: addedLines, countdown: 2.5 }]);
    }
  }, [multiplayer.incomingGarbage, multiplayer]);

  // Countdown timer for pending garbage
  useEffect(() => {
    if (garbageQueue.length === 0) return;
    const interval = setInterval(() => {
      setGarbageQueue(prev => {
        const next: { lines: number; countdown: number }[] = [];
        for (const item of prev) {
          const updated = item.countdown - 0.2;
          if (updated <= 0) {
            // Defense window expired: push to pending garbage
            pendingGarbageRef.current += item.lines;
          } else {
            next.push({ lines: item.lines, countdown: Math.max(0, updated) });
          }
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [garbageQueue]);

  // Spawn visual floating particles for Tetris/T-Spin/Clear
  const spawnParticles = (type: 'tetris' | 'tspin' | 'clear') => {
    const colors = type === 'tspin'
      ? ['#d946ef', '#ec4899', '#a855f7', '#ffffff']
      : type === 'tetris'
      ? ['#00f2fe', '#38bdf8', '#0ea5e9', '#ffffff', '#fbbf24']
      : ['#38bdf8', '#a855f7', '#f43f5e'];

    const count = type === 'tspin' || type === 'tetris' ? 35 : 18;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x: (COLS * BLOCK_SIZE) / 2 + (Math.random() - 0.5) * 80,
        y: (ROWS * BLOCK_SIZE) / 2 + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: Math.random() * 0.4 + 0.6,
        size: Math.random() * 4 + 2,
      });
    }
  };

  // Initialize engine
  useEffect(() => {
    const engine = new TetrisEngine();
    engineRef.current = engine;

    engine.onStateChange = (state) => {
      setGameState(state);

      // Send matrix updates to server (throttled by engine tick)
      multiplayer.sendMatrixUpdate(
        state.matrix,
        state.telemetry.score,
        state.telemetry.lines,
        !state.isGameOver
      );

      if (state.lastClear && Date.now() - state.lastClear.timestamp < 100) {
        setActionText(state.lastClear.text);
        setTimeout(() => setActionText(null), 1400);

        // Visual flash & particle effects
        if (state.lastClear.isTSpin) {
          spawnParticles('tspin');
        } else if (state.lastClear.clearType === 'quad') {
          spawnParticles('tetris');
        } else {
          spawnParticles('clear');
        }

        // Flash bottom rows that were cleared
        setClearedRowsFlash([ROWS - 1, ROWS - 2]);
        setTimeout(() => setClearedRowsFlash([]), 300);
      }

      if (state.isGameOver && !matchProcessedRef.current) {
        matchProcessedRef.current = true;
        multiplayer.sendMatrixUpdate(state.matrix, state.telemetry.score, state.telemetry.lines, false);
      }
    };

    // When lines are cleared, send garbage to opponent
    engine.onGarbageSent = (lines, clearType) => {
      multiplayer.sendAttack(lines, clearType);
      if (audio.enabled) {
        if (clearType === 'tspin') audio.playTSpin();
        else if (clearType === 'quad' || clearType === 'tetris') audio.playTetris();
        else audio.playClear();
      }
    };

    engine.onSoundTrigger = (sound) => {
      if (!audio.enabled) return;
      switch (sound) {
        case 'move': audio.playMove(); break;
        case 'rotate': audio.playRotate(); break;
        case 'drop': audio.playDrop(); break;
        case 'hold': audio.playHold(); break;
        case 'clear': audio.playClear(); break;
        case 'tetris': audio.playTetris(); break;
        case 'tspin': audio.playTSpin(); break;
        case 'gameover': audio.playGameOver(); break;
      }
    };

    setGameState({ ...engine.state });

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      const ks = keyStateRef.current;
      if (ks.left || ks.right) {
        ks.dasTimer += delta;
        if (ks.dasTimer >= DAS_DELAY) {
          ks.arrTimer += delta;
          if (ks.arrTimer >= ARR_RATE) {
            ks.arrTimer = 0;
            if (ks.left) engine.moveLeft();
            if (ks.right) engine.moveRight();
          }
        }
      }
      // Soft drop com timer fluido (controlado)
      if (ks.down) {
        ks.softDropTimer += delta;
        if (ks.softDropTimer >= SOFT_DROP_RATE) {
          ks.softDropTimer = 0;
          engine.softDrop();
        }
      } else {
        ks.softDropTimer = 0;
      }

      // Apply pending garbage whose defense window has passed
      if (pendingGarbageRef.current > 0 && !engine.state.isGameOver) {
        engine.addIncomingGarbage(pendingGarbageRef.current);
        pendingGarbageRef.current = 0;
      }

      // Update particles
      const dtSec = delta / 1000;
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 2.5 * dtSec; // subtle gravity
        p.life -= dtSec / p.maxLife;
        return p.life > 0;
      });

      engine.tick(delta);
      drawAll();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      const ks = keyStateRef.current;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA':
          if (!ks.left) { ks.left = true; ks.dasTimer = 0; ks.arrTimer = 0; engine.moveLeft(); }
          break;
        case 'ArrowRight': case 'KeyD':
          if (!ks.right) { ks.right = true; ks.dasTimer = 0; ks.arrTimer = 0; engine.moveRight(); }
          break;
        case 'ArrowDown': case 'KeyS':
          if (!ks.down) {
            ks.down = true;
            ks.softDropTimer = 0;
            engine.softDrop();
          }
          break;
        case 'ArrowUp': case 'KeyW': case 'KeyX':
          engine.rotateCW();
          break;
        case 'KeyZ':
          engine.rotateCCW();
          break;
        case 'Space':
          engine.hardDrop();
          break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyC':
          engine.hold();
          break;
        case 'KeyP': case 'Escape':
          engine.togglePause();
          break;
        case 'KeyR':
          if (engine.state.isGameOver) {
            matchProcessedRef.current = false;
            engine.init();
          }
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const ks = keyStateRef.current;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': ks.left = false; break;
        case 'ArrowRight': case 'KeyD': ks.right = false; break;
        case 'ArrowDown': case 'KeyS': ks.down = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const drawAll = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const matrixCanvas = matrixCanvasRef.current;
    const holdCanvas = holdCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!matrixCanvas || !holdCanvas || !nextCanvas) return;

    const mCtx = matrixCanvas.getContext('2d');
    const hCtx = holdCanvas.getContext('2d');
    const nCtx = nextCanvas.getContext('2d');
    if (!mCtx || !hCtx || !nCtx) return;

    mCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    mCtx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      mCtx.beginPath(); mCtx.moveTo(c * BLOCK_SIZE, 0); mCtx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE); mCtx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      mCtx.beginPath(); mCtx.moveTo(0, r * BLOCK_SIZE); mCtx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE); mCtx.stroke();
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.state.matrix[r][c];
        if (cell !== 0) drawBlock(mCtx, c, r, cell === 'G' ? '#64748b' : PIECES[cell as PieceType].color, false);
      }
    }
    if (engine.state.currentPiece && !engine.state.isGameOver) {
      const piece = engine.state.currentPiece;
      const shape = PIECES[piece.type].shapes[piece.rotation];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) drawGhostBlock(mCtx, piece.x + c, engine.state.ghostY + r, PIECES[piece.type].color);
        }
      }
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) drawBlock(mCtx, piece.x + c, piece.y + r, PIECES[piece.type].color, true);
        }
      }
    }

    // Draw line clear flash effects
    if (clearedRowsFlash.length > 0) {
      mCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (const r of clearedRowsFlash) {
        mCtx.fillRect(0, r * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
      }
    }

    // Draw floating particles
    for (const p of particlesRef.current) {
      mCtx.save();
      mCtx.globalAlpha = Math.max(0, p.life);
      mCtx.fillStyle = p.color;
      mCtx.shadowColor = p.color;
      mCtx.shadowBlur = 6;
      mCtx.beginPath();
      mCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      mCtx.fill();
      mCtx.restore();
    }

    hCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (engine.state.holdPiece) drawMiniPiece(hCtx, engine.state.holdPiece, 50, 40, engine.state.canHold);

    nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < engine.state.nextQueue.length; i++) {
      drawMiniPiece(nCtx, engine.state.nextQueue[i], 50, 30 + i * 58, true);
    }
  }, [clearedRowsFlash]);

  const drawBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string, isGlowing: boolean) => {
    const x = col * BLOCK_SIZE, y = row * BLOCK_SIZE, size = BLOCK_SIZE, pad = 2;
    if (isGlowing) { ctx.shadowColor = color; ctx.shadowBlur = 8; } else { ctx.shadowBlur = 0; }
    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, 2);
    ctx.fillRect(x + pad, y + pad, 2, size - pad * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + pad, y + size - pad - 2, size - pad * 2, 2);
    ctx.fillRect(x + size - pad - 2, y + pad, 2, size - pad * 2);
    ctx.shadowBlur = 0;
  };

  const drawGhostBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string) => {
    const x = col * BLOCK_SIZE, y = row * BLOCK_SIZE, size = BLOCK_SIZE, pad = 2;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
  };

  const drawMiniPiece = (ctx: CanvasRenderingContext2D, type: PieceType, centerX: number, centerY: number, active: boolean) => {
    const shape = PIECES[type].shapes[0];
    const color = active ? PIECES[type].color : '#475569';
    const width = shape[0].length * MINI_BLOCK_SIZE, height = shape.length * MINI_BLOCK_SIZE;
    const startX = centerX - width / 2, startY = centerY - height / 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          ctx.fillStyle = color;
          ctx.fillRect(startX + c * MINI_BLOCK_SIZE + 1, startY + r * MINI_BLOCK_SIZE + 1, MINI_BLOCK_SIZE - 2, MINI_BLOCK_SIZE - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(startX + c * MINI_BLOCK_SIZE + 1, startY + r * MINI_BLOCK_SIZE + 1, MINI_BLOCK_SIZE - 2, 2);
        }
      }
    }
  };

  const telemetry = gameState?.telemetry;
  const totalQueuedGarbage = garbageQueue.reduce((acc, q) => acc + q.lines, 0) + pendingGarbageRef.current;
  const earliestCountdown = garbageQueue.length > 0 ? Math.min(...garbageQueue.map(q => q.countdown)) : null;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Player label */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs font-bold text-cyan-400">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        {username}
      </div>

      {/* Main layout */}
      <div className="flex gap-2 items-start">
        {/* Hold + Stats */}
        <div className="flex flex-col gap-2 w-[100px]">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
            <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">HOLD</div>
            <canvas ref={holdCanvasRef} width={100} height={80} className="block" />
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center gap-1.5 text-center">
            <div className="text-[9px] font-mono text-slate-500">SCORE</div>
            <div className="text-base font-black font-mono text-cyan-400">{telemetry?.score.toLocaleString() || 0}</div>
            <div className="text-[9px] font-mono text-slate-500">LINES</div>
            <div className="text-sm font-bold font-mono text-amber-400">{telemetry?.lines || 0}</div>
            <div className="text-[9px] font-mono text-slate-500">LVL</div>
            <div className="text-sm font-bold font-mono text-fuchsia-400">{telemetry?.level || 1}</div>
            {telemetry && telemetry.combo > 0 && (
              <div className="text-[9px] text-pink-400 font-black animate-pulse">×{telemetry.combo} COMBO</div>
            )}
          </div>
        </div>

        {/* Main board with garbage indicator */}
        <div className="relative flex items-center">
          {/* Garbage Queue Warning Bar with Countdown */}
          {totalQueuedGarbage > 0 && (
            <div className="flex flex-col items-center mr-1">
              {/* Countdown timer badge */}
              {earliestCountdown !== null && (
                <div className="text-[9px] font-mono font-black text-rose-400 animate-pulse bg-rose-950/80 px-1 py-0.5 rounded border border-rose-500/50 mb-1">
                  {earliestCountdown.toFixed(1)}s
                </div>
              )}
              {/* Flashing Warning Bar with Gray and Red Blocks */}
              <div
                className={`w-3.5 h-[520px] flex flex-col-reverse rounded-l-lg overflow-hidden border border-rose-500/60 bg-slate-900/90 shadow-[0_0_15px_rgba(244,63,94,0.4)] ${
                  garbageFlash ? 'animate-pulse ring-2 ring-rose-500' : ''
                }`}
              >
                {Array.from({ length: Math.min(totalQueuedGarbage, 20) }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-slate-600 to-rose-500/90 border-t border-slate-700/80 animate-pulse"
                    style={{ animationDuration: `${0.4 + (i % 3) * 0.2}s` }}
                  />
                ))}
              </div>
              <div className="text-[8px] font-mono font-bold text-rose-400 mt-1">+{totalQueuedGarbage}L</div>
            </div>
          )}

          <div
            className={`relative bg-slate-950/95 border-2 rounded-xl overflow-hidden transition-colors duration-150 ${
              garbageFlash ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.7)]' : 'border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.15)]'
            }`}
          >
            <canvas
              ref={matrixCanvasRef}
              width={COLS * BLOCK_SIZE}
              height={ROWS * BLOCK_SIZE}
              className="block bg-[#070913]"
            />

            {/* Action clear text (T-SPIN / QUAD / COMBOS) */}
            {actionText && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-2xl font-black text-white tracking-wider drop-shadow-[0_0_20px_#00f2fe] animate-bounce whitespace-nowrap z-20">
                <span className="bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 text-transparent bg-clip-text">
                  {actionText}
                </span>
              </div>
            )}

            {/* Pause overlay */}
            {gameState?.isPaused && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-30">
                <div className="text-2xl font-black text-cyan-400">PAUSADO</div>
              </div>
            )}

            {/* Game Over overlay with Spectator status */}
            {gameState?.isGameOver && (
              <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center gap-2 z-30 p-4 animate-fadeIn">
                <div className="text-3xl font-black text-rose-500 tracking-wider">GAME OVER</div>
                <div className="text-xs text-slate-300 font-mono">{telemetry?.score.toLocaleString()} pts</div>
                <div className="mt-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                  MODO SPECTATOR
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">Acompanhando o restante da arena...</div>
              </div>
            )}
          </div>
        </div>

        {/* Next queue */}
        <div className="flex flex-col w-[100px]">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
            <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">NEXT</div>
            <canvas ref={nextCanvasRef} width={100} height={290} className="block" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { audio.enabled = !soundEnabled; setSoundEnabled(s => !s); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 transition hover:bg-slate-700/80"
        >
          {soundEnabled ? <Volume2 size={11} className="text-cyan-400" /> : <VolumeX size={11} className="text-rose-400" />}
        </button>
        <button
          onClick={() => engineRef.current?.togglePause()}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 transition hover:bg-slate-700/80"
        >
          {gameState?.isPaused ? <Play size={11} className="text-emerald-400" /> : <Pause size={11} className="text-amber-400" />}
        </button>
      </div>
    </div>
  );
}
