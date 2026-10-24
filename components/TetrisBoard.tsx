'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { TetrisEngine } from '@/lib/tetris/engine';
import { TetrisState, PieceType } from '@/lib/tetris/types';
import { COLS, ROWS, PIECES } from '@/lib/tetris/constants';
import { audio } from '@/components/AudioPlayer';
import { Volume2, VolumeX, RotateCcw, Pause, Play, Sparkles, Trophy } from 'lucide-react';

const BLOCK_SIZE = 30; // 300 x 600 main canvas
const MINI_BLOCK_SIZE = 20;

interface MatchEndResult {
  earnedXp: number;
  didLevelUp: boolean;
  isNewHighScore: boolean;
}

interface TetrisBoardProps {
  onMatchEnd?: (result: { score: number; lines: number; won?: boolean }) => Promise<MatchEndResult | null | undefined>;
}

export default function TetrisBoard({ onMatchEnd }: TetrisBoardProps) {
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<TetrisEngine | null>(null);
  const [gameState, setGameState] = useState<TetrisState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionText, setActionText] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchEndResult | null>(null);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  const matchProcessedRef = useRef(false);

  // Key state tracking for smooth DAS/ARR
  const keyStateRef = useRef<{
    left: boolean;
    right: boolean;
    down: boolean;
    dasTimer: number;
    arrTimer: number;
  }>({
    left: false,
    right: false,
    down: false,
    dasTimer: 0,
    arrTimer: 0,
  });

  const DAS_DELAY = 140; // ms before auto-repeat kicks in
  const ARR_RATE = 30;   // ms per repeat step

  // Initialize engine
  useEffect(() => {
    const engine = new TetrisEngine();
    engineRef.current = engine;

    engine.onStateChange = (state) => {
      setGameState(state);
      if (state.lastClear && Date.now() - state.lastClear.timestamp < 100) {
        setActionText(state.lastClear.text);
        setTimeout(() => setActionText(null), 1200);
      }

      if (state.isGameOver && !matchProcessedRef.current && onMatchEnd) {
        matchProcessedRef.current = true;
        setIsSubmittingMatch(true);
        onMatchEnd({
          score: state.telemetry.score,
          lines: state.telemetry.lines,
          won: false,
        })
          .then((res) => {
            if (res) setMatchResult(res);
          })
          .finally(() => {
            setIsSubmittingMatch(false);
          });
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
        case 'gameover': audio.playGameOver(); break;
      }
    };

    setGameState({ ...engine.state });

    // 60 FPS Render & Physics Loop
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // Handle keyboard DAS / ARR
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
      if (ks.down) {
        engine.softDrop();
      }

      engine.tick(delta);
      drawAll();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Prevent scrolling on gameplay keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      const ks = keyStateRef.current;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          if (!ks.left) {
            ks.left = true;
            ks.dasTimer = 0;
            ks.arrTimer = 0;
            engine.moveLeft();
          }
          break;

        case 'ArrowRight':
        case 'KeyD':
          if (!ks.right) {
            ks.right = true;
            ks.dasTimer = 0;
            ks.arrTimer = 0;
            engine.moveRight();
          }
          break;

        case 'ArrowDown':
        case 'KeyS':
          ks.down = true;
          engine.softDrop();
          break;

        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          engine.rotateCW();
          break;

        case 'KeyZ':
          engine.rotateCCW();
          break;

        case 'Space':
          engine.hardDrop();
          break;

        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          engine.hold();
          break;

        case 'KeyP':
        case 'Escape':
          engine.togglePause();
          break;

        case 'KeyR':
          engine.init();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const ks = keyStateRef.current;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          ks.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          ks.right = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          ks.down = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Drawing Canvas Elements
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

    // 1. Draw Main Matrix
    mCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    // Matrix background grid lines
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    mCtx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      mCtx.beginPath();
      mCtx.moveTo(c * BLOCK_SIZE, 0);
      mCtx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      mCtx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      mCtx.beginPath();
      mCtx.moveTo(0, r * BLOCK_SIZE);
      mCtx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      mCtx.stroke();
    }

    // Locked matrix blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.state.matrix[r][c];
        if (cell !== 0) {
          drawBlock(mCtx, c, r, PIECES[cell].color, false);
        }
      }
    }

    // Ghost Piece
    if (engine.state.currentPiece && !engine.state.isGameOver) {
      const piece = engine.state.currentPiece;
      const ghostY = engine.state.ghostY;
      const shape = PIECES[piece.type].shapes[piece.rotation];

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawGhostBlock(mCtx, piece.x + c, ghostY + r, PIECES[piece.type].color);
          }
        }
      }

      // Active Piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawBlock(mCtx, piece.x + c, piece.y + r, PIECES[piece.type].color, true);
          }
        }
      }
    }

    // 2. Draw Hold Box
    hCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (engine.state.holdPiece) {
      drawMiniPiece(hCtx, engine.state.holdPiece, 60, 48, engine.state.canHold);
    }

    // 3. Draw Next Queue (5 pieces)
    nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < engine.state.nextQueue.length; i++) {
      const type = engine.state.nextQueue[i];
      const yCenter = 36 + i * 70;
      drawMiniPiece(nCtx, type, 60, yCenter, true);
    }
  }, []);

  const drawBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string, isGlowing: boolean) => {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const size = BLOCK_SIZE;
    const pad = 2;

    if (isGlowing) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Bevel highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, 3);
    ctx.fillRect(x + pad, y + pad, 3, size - pad * 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + pad, y + size - pad - 3, size - pad * 2, 3);
    ctx.fillRect(x + size - pad - 3, y + pad, 3, size - pad * 2);

    ctx.shadowBlur = 0;
  };

  const drawGhostBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string) => {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const size = BLOCK_SIZE;
    const pad = 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
  };

  const drawMiniPiece = (ctx: CanvasRenderingContext2D, type: PieceType, centerX: number, centerY: number, active: boolean) => {
    const shape = PIECES[type].shapes[0];
    const color = active ? PIECES[type].color : '#475569';
    const width = shape[0].length * MINI_BLOCK_SIZE;
    const height = shape.length * MINI_BLOCK_SIZE;
    const startX = centerX - width / 2;
    const startY = centerY - height / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const x = startX + c * MINI_BLOCK_SIZE;
          const y = startY + r * MINI_BLOCK_SIZE;

          ctx.fillStyle = color;
          ctx.fillRect(x + 1.5, y + 1.5, MINI_BLOCK_SIZE - 3, MINI_BLOCK_SIZE - 3);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(x + 1.5, y + 1.5, MINI_BLOCK_SIZE - 3, 2);
        }
      }
    }
  };

  const toggleSound = () => {
    audio.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleRestart = () => {
    matchProcessedRef.current = false;
    setMatchResult(null);
    engineRef.current?.init();
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const telemetry = gameState?.telemetry;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-4 select-none">
      {/* Top Bar with sound and pause controls */}
      <div className="flex justify-between items-center w-full mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            T
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white">
              TETR.IO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">ADRIANO</span>
            </h1>
            <p className="text-[10px] tracking-widest font-mono text-slate-400">NEXT.JS 60 FPS + NEON POSTGRES // ETAPA 2</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 text-amber-300 border border-amber-500/40 transition shadow-[0_0_10px_rgba(255,214,10,0.2)]"
            title="Ver Placar Global"
          >
            <Trophy size={14} className="text-amber-400" />
            <span>Leaderboard</span>
          </Link>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition"
            title="Ativar/Desativar Som"
          >
            {soundEnabled ? <Volume2 size={15} className="text-cyan-400" /> : <VolumeX size={15} className="text-rose-400" />}
            <span>{soundEnabled ? 'Áudio On' : 'Mudo'}</span>
          </button>
          <button
            onClick={handleTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition"
          >
            {gameState?.isPaused ? <Play size={15} className="text-emerald-400" /> : <Pause size={15} className="text-amber-400" />}
            <span>{gameState?.isPaused ? 'Continuar' : 'Pausar'}</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition"
            title="Reiniciar (R)"
          >
            <RotateCcw size={15} className="text-cyan-400" />
            <span>Reiniciar [R]</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Grid */}
      <div className="grid grid-cols-[160px_auto_160px] gap-6 justify-center items-start">
        {/* Left Column: Hold & Telemetry */}
        <div className="flex flex-col gap-4">
          {/* Hold Box */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 flex flex-col items-center shadow-lg">
            <div className="text-[11px] font-extrabold tracking-wider text-slate-400 mb-2">
              HOLD <span className="text-[9px] font-mono text-slate-500">[Shift/C]</span>
            </div>
            <div className="bg-black/40 rounded-xl p-2 border border-slate-800/80 flex items-center justify-center">
              <canvas ref={holdCanvasRef} width={120} height={96} className="block" />
            </div>
          </div>

          {/* Telemetry Stats */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 flex flex-col items-center shadow-lg gap-3">
            <div className="text-[11px] font-extrabold tracking-wider text-slate-400">TELEMETRIA</div>

            <div className="flex flex-col items-center w-full">
              <span className="text-[10px] font-mono tracking-wider text-slate-500">PONTUAÇÃO</span>
              <span className="text-2xl font-black font-mono text-cyan-400 drop-shadow-[0_0_10px_rgba(0,242,254,0.4)]">
                {telemetry?.score.toLocaleString() || 0}
              </span>
            </div>

            <div className="flex flex-col items-center w-full">
              <span className="text-[10px] font-mono tracking-wider text-slate-500">NÍVEL</span>
              <span className="text-xl font-extrabold font-mono text-fuchsia-400">
                {telemetry?.level || 1}
              </span>
            </div>

            <div className="flex flex-col items-center w-full">
              <span className="text-[10px] font-mono tracking-wider text-slate-500">LINHAS</span>
              <span className="text-xl font-extrabold font-mono text-amber-400">
                {telemetry?.lines || 0}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-slate-800/80 text-center">
              <div>
                <span className="text-[9px] font-mono text-slate-500 block">PPS</span>
                <span className="text-sm font-bold font-mono text-cyan-300">{telemetry?.pps.toFixed(2) || '0.00'}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 block">APM</span>
                <span className="text-sm font-bold font-mono text-cyan-300">{telemetry?.apm.toFixed(1) || '0.0'}</span>
              </div>
            </div>

            {telemetry && telemetry.combo > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 border border-pink-500/40 rounded-full text-pink-400 text-xs font-black animate-pulse">
                <Sparkles size={12} />
                <span>COMBO x{telemetry.combo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Main Tetris Matrix */}
        <div className="relative">
          <div className="relative bg-slate-950/95 border-2 border-cyan-500/40 rounded-2xl p-1 shadow-[0_0_35px_rgba(0,242,254,0.25)] overflow-hidden">
            <canvas
              ref={matrixCanvasRef}
              width={300}
              height={600}
              className="block bg-[#090b14] rounded-xl"
            />

            {/* Action Clear Banner */}
            {actionText && (
              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-2xl font-black text-white text-center tracking-wider drop-shadow-[0_0_20px_#00f2fe] animate-bounce whitespace-nowrap z-20">
                {actionText}
              </div>
            )}

            {/* Pause Overlay */}
            {gameState?.isPaused && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                <h2 className="text-3xl font-black text-cyan-400 tracking-wider mb-2">PAUSADO</h2>
                <p className="text-xs text-slate-400 mb-4 font-mono">Pressione P ou Esc para continuar</p>
                <button
                  onClick={handleTogglePause}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:brightness-110 transition"
                >
                  Continuar Partida
                </button>
              </div>
            )}

            {/* Game Over Overlay */}
            {gameState?.isGameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                <h2 className="text-3xl font-black text-rose-500 tracking-wider mb-1">GAME OVER</h2>
                <p className="text-xs text-slate-400 font-mono mb-4">A matriz foi bloqueada!</p>

                <div className="grid grid-cols-2 gap-3 w-full max-w-[240px] mb-4">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono block">PONTOS</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">
                      {telemetry?.score.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono block">LINHAS</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {telemetry?.lines || 0}
                    </span>
                  </div>
                </div>

                {/* Sincronização e Recompensas Neon Database */}
                <div className="w-full max-w-[240px] mb-5 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-xs font-mono">
                  {isSubmittingMatch ? (
                    <div className="flex items-center justify-center gap-1.5 text-cyan-400">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Salvando no Neon DB...</span>
                    </div>
                  ) : matchResult ? (
                    <div className="flex flex-col gap-1 text-center">
                      <div className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <span>+ {matchResult.earnedXp} XP GANHO!</span>
                      </div>
                      {matchResult.didLevelUp && (
                        <div className="text-fuchsia-400 font-black animate-pulse">
                          🎉 SUBIU DE NÍVEL!
                        </div>
                      )}
                      {matchResult.isNewHighScore && (
                        <div className="text-amber-400 font-black">
                          🏆 NOVO RECORD (HIGH SCORE)!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px]">Sincronizado com Neon Database</div>
                  )}
                </div>

                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:brightness-110 transition"
                >
                  Jogar Novamente [R]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Next Queue */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 flex flex-col items-center shadow-lg">
            <div className="text-[11px] font-extrabold tracking-wider text-slate-400 mb-2">PRÓXIMAS (NEXT)</div>
            <div className="bg-black/40 rounded-xl p-2 border border-slate-800/80 flex items-center justify-center">
              <canvas ref={nextCanvasRef} width={120} height={360} className="block" />
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Controls Footer Bar */}
      <div className="flex flex-wrap justify-center gap-3 mt-6 p-3 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-xl text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">&larr;</kbd>
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">&rarr;</kbd>
          <span className="text-slate-400">/ A D : Mover</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">&uarr;</kbd>
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">W</kbd>
          <span className="text-slate-400">: Girar Horário</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">Z</kbd>
          <span className="text-slate-400">: Girar Anti-horário</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">&darr;</kbd>
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">S</kbd>
          <span className="text-slate-400">: Soft Drop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">Espaço</kbd>
          <span className="text-slate-400">: Hard Drop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">Shift</kbd>
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">C</kbd>
          <span className="text-slate-400">: Hold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">P</kbd>
          <span className="text-slate-400">: Pausar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono">R</kbd>
          <span className="text-slate-400">: Reiniciar</span>
        </div>
      </div>
    </div>
  );
}
