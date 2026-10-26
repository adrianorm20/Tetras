'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TetrisEngine } from '@/lib/tetris/engine';
import { TetrisState, PieceType } from '@/lib/tetris/types';
import { COLS, ROWS, PIECES } from '@/lib/tetris/constants';
import { audio } from '@/components/AudioPlayer';
import { UseMultiplayerReturn } from '@/lib/tetris/useMultiplayer';
import { Volume2, VolumeX, Heart, Layers, Skull, Zap } from 'lucide-react';
import OpponentMatrixThumbnail from './OpponentMatrixThumbnail';

const BLOCK_SIZE = 26;
const MINI_BLOCK_SIZE = 18;

interface FloorsBoardProps {
  multiplayer: UseMultiplayerReturn;
  username: string;
}

export default function FloorsBoard({ multiplayer, username }: FloorsBoardProps) {
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<TetrisEngine | null>(null);
  const [gameState, setGameState] = useState<TetrisState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionText, setActionText] = useState<string | null>(null);
  const [hpFlash, setHpFlash] = useState(false);
  const matchProcessedRef = useRef(false);

  // Danger & Shake state
  const [isShaking, setIsShaking] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  const dangerPulseRef = useRef<number>(0);

  // Line flash animation state & particles
  const [clearedRowsFlash, setClearedRowsFlash] = useState<number[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }[]>([]);

  // Smooth DAS/ARR and soft drop
  const keyStateRef = useRef({ left: false, right: false, down: false, dasTimer: 0, arrTimer: 0, softDropTimer: 0 });
  const DAS_DELAY = 140;
  const ARR_RATE = 30;
  const SOFT_DROP_RATE = 40;

  // Lixo recebido dos oponentes na fila global contínua
  useEffect(() => {
    if (multiplayer.incomingGarbage > 0) {
      const addedLines = multiplayer.incomingGarbage;
      multiplayer.consumeGarbage();

      if (engineRef.current && !engineRef.current.state.isGameOver) {
        engineRef.current.addIncomingGarbage(addedLines);
      }

      if (audio.enabled && addedLines >= 3) {
        audio.playDangerAlert();
      }
    }
  }, [multiplayer.incomingGarbage, multiplayer]);

  // Spawn visual floating particles
  const spawnParticles = (type: 'tetris' | 'tspin' | 'clear' | 'damage') => {
    const colors = type === 'tspin'
      ? ['#d946ef', '#ec4899', '#a855f7', '#ffffff']
      : type === 'tetris'
      ? ['#00f2fe', '#38bdf8', '#0ea5e9', '#ffffff', '#fbbf24']
      : type === 'damage'
      ? ['#ef4444', '#f87171', '#dc2626', '#fbbf24']
      : ['#38bdf8', '#a855f7', '#f43f5e'];

    const count = type === 'tspin' || type === 'tetris' || type === 'damage' ? 30 : 16;
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

  // Initialize engine in floorMode (TFT HP 100 -> 0 + Floor Gravity Escalation)
  useEffect(() => {
    const engine = new TetrisEngine(true, true);
    engineRef.current = engine;

    engine.onStateChange = (state) => {
      setGameState(state);

      // Sincroniza estado, matrix, HP e Floor com o servidor contínuo
      multiplayer.sendMatrixUpdate(
        state.matrix,
        state.telemetry.score,
        state.telemetry.lines,
        !state.isGameOver,
        state.hp,
        state.maxHp,
        state.floor
      );

      if (state.lastClear && Date.now() - state.lastClear.timestamp < 100) {
        setActionText(state.lastClear.text);
        setTimeout(() => setActionText(null), 1400);

        if (state.lastClear.isTSpin) {
          spawnParticles('tspin');
        } else if (state.lastClear.clearType === 'quad') {
          spawnParticles('tetris');
        } else {
          spawnParticles('clear');
        }

        setClearedRowsFlash([ROWS - 1, ROWS - 2]);
        setTimeout(() => setClearedRowsFlash([]), 300);
      }

      if (state.isGameOver && !matchProcessedRef.current) {
        matchProcessedRef.current = true;
        multiplayer.sendMatrixUpdate(
          state.matrix,
          state.telemetry.score,
          state.telemetry.lines,
          false,
          state.hp,
          state.maxHp,
          state.floor
        );
      }
    };

    engine.onHpDamage = (currentHp, damage) => {
      setHpFlash(true);
      setIsShaking(true);
      spawnParticles('damage');
      setTimeout(() => setHpFlash(false), 500);
      setTimeout(() => setIsShaking(false), 260);
      if (audio.enabled) {
        audio.playDangerAlert();
      }
    };

    engine.onFloorUp = (newFloor) => {
      setActionText(`SUBIU PARA O ANDAR ${newFloor}!`);
      setTimeout(() => setActionText(null), 1600);
      spawnParticles('tetris');
      if (audio.enabled) {
        audio.playTetris();
      }
    };

    // Garbage sending para oponentes
    engine.onGarbageSent = (lines, type) => {
      multiplayer.sendAttack(lines, type);
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
        case 'garbage_rise':
          audio.playGarbageRise();
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 220);
          break;
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

      if (ks.down) {
        ks.softDropTimer += delta;
        if (ks.softDropTimer >= SOFT_DROP_RATE) {
          ks.softDropTimer = 0;
          engine.softDrop();
        }
      } else {
        ks.softDropTimer = 0;
      }

      // Particles
      const dtSec = delta / 1000;
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 2.5 * dtSec;
        p.life -= dtSec / p.maxLife;
        return p.life > 0;
      });

      engine.tick(delta);

      dangerPulseRef.current += delta;
      const stackHeight = engine.getStackHeight();
      const DANGER_THRESHOLD = Math.floor(ROWS * 0.8);
      const inDanger = !engine.state.isGameOver && stackHeight >= DANGER_THRESHOLD;
      setIsDanger(inDanger);

      drawAll(inDanger, dangerPulseRef.current);
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
          if (!ks.down) {
            ks.down = true;
            ks.softDropTimer = 0;
            engine.softDrop();
          }
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

  // Canvas drawing
  const drawAll = useCallback((inDanger: boolean = false, pulseTime: number = 0) => {
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

    // 1. Matrix Background & Grid
    mCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
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

    // Locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = engine.state.matrix[r][c];
        if (cell !== 0) {
          const color = cell === 'G' ? '#64748b' : PIECES[cell]?.color || '#00f2fe';
          drawBlock(mCtx, c, r, color, false);
        }
      }
    }

    // Cleared rows flash effect
    if (clearedRowsFlash.length > 0) {
      mCtx.save();
      mCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      mCtx.shadowColor = '#00f2fe';
      mCtx.shadowBlur = 20;
      for (const r of clearedRowsFlash) {
        mCtx.fillRect(0, r * BLOCK_SIZE, matrixCanvas.width, BLOCK_SIZE);
      }
      mCtx.restore();
    }

    // Floating particles
    for (const p of particlesRef.current) {
      mCtx.save();
      mCtx.globalAlpha = Math.max(0, p.life);
      mCtx.fillStyle = p.color;
      mCtx.shadowColor = p.color;
      mCtx.shadowBlur = 6;
      mCtx.beginPath();
      mCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      mCtx.fill();
      mCtx.restore();
    }

    // Ghost piece
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

      // Active piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawBlock(mCtx, piece.x + c, piece.y + r, PIECES[piece.type].color, true);
          }
        }
      }
    }

    // 2. Hold Piece
    hCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (engine.state.holdPiece) {
      drawMiniPiece(hCtx, engine.state.holdPiece, 50, 40, engine.state.canHold);
    }

    // 3. Next Queue (5 pieces)
    nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < engine.state.nextQueue.length; i++) {
      drawMiniPiece(nCtx, engine.state.nextQueue[i], 50, 30 + i * 58, true);
    }

    // Danger Pulse
    if (inDanger) {
      const pulse = (Math.sin((pulseTime / 300) * Math.PI) + 1) / 2;
      const alpha = 0.25 + pulse * 0.55;
      mCtx.save();
      mCtx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      mCtx.lineWidth = 10;
      mCtx.shadowColor = `rgba(239, 68, 68, ${alpha})`;
      mCtx.shadowBlur = 16 + pulse * 16;
      mCtx.strokeRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      mCtx.restore();
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

  const currentHp = gameState?.hp ?? 100;
  const currentFloor = gameState?.floor ?? 1;
  const telemetry = gameState?.telemetry;

  // Monta a lista completa de jogadores para o painel de andares (Você + Oponentes)
  const allPlayersInFloors: { id: string; username: string; floor: number; hp: number; isAlive: boolean; isYou: boolean }[] = [
    {
      id: multiplayer.mySocketId || 'you',
      username: `${username} (Você)`,
      floor: currentFloor,
      hp: currentHp,
      isAlive: !gameState?.isGameOver,
      isYou: true,
    },
    ...multiplayer.opponents.map(op => ({
      id: op.id,
      username: op.username,
      floor: op.floor || 1,
      hp: op.hp ?? 100,
      isAlive: op.isAlive,
      isYou: false,
    })),
  ].sort((a, b) => {
    if (b.floor !== a.floor) return b.floor - a.floor;
    return b.hp - a.hp;
  });

  // Agrupa os andares atingidos (do mais alto para o Andar 1)
  const maxFloorReached = Math.max(5, ...allPlayersInFloors.map(p => p.floor));
  const floorLevels = Array.from({ length: maxFloorReached }, (_, idx) => maxFloorReached - idx);

  return (
    <div className="w-full flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 select-none animate-in fade-in duration-300">
      {/* ── PAINEL CENTRAL DE JOGO COM BARRA DE HP TFT ── */}
      <div className="flex flex-col items-center gap-3">
        {/* BARRA DE HP ESTILO TFT (100 A 0) */}
        <div className={`w-full max-w-[420px] bg-slate-900/90 border rounded-2xl p-3 shadow-lg transition-all duration-300 ${
          hpFlash ? 'border-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-[1.02]' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-200">
              <Heart size={14} className={currentHp <= 25 ? 'text-rose-500 fill-rose-500 animate-bounce' : 'text-emerald-400 fill-emerald-400'} />
              <span>VIDA (TFT HP)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80">
                ANDAR {currentFloor}
              </span>
              <span className={`text-sm ${
                currentHp > 50 ? 'text-emerald-400' : currentHp > 25 ? 'text-amber-400' : 'text-rose-400 animate-pulse'
              }`}>
                {currentHp} / 100
              </span>
            </div>
          </div>

          {/* Barra de Progresso de Vida */}
          <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentHp > 50
                  ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                  : currentHp > 25
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                  : 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
              }`}
              style={{ width: `${Math.max(0, currentHp)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
            <span>Ao encostar no topo: penalidade rápida (-20 HP)</span>
            <span>0 HP = Eliminação</span>
          </div>
        </div>

        {/* Tabuleiro Tetris */}
        <div className="flex gap-2 items-start">
          {/* Hold + Status */}
          <div className="flex flex-col gap-2 w-[100px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
              <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">HOLD</div>
              <canvas ref={holdCanvasRef} width={100} height={80} className="block" />
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center gap-1.5 text-center">
              <div className="text-[9px] font-mono text-slate-500">ANDAR</div>
              <div className="text-lg font-black font-mono text-cyan-300">F{currentFloor}</div>
              <div className="text-[9px] font-mono text-slate-500">LINHAS</div>
              <div className="text-sm font-bold font-mono text-amber-400">{telemetry?.lines || 0}</div>
              <div className="text-[8px] font-mono text-slate-500">GRAVIDADE</div>
              <div className="text-[11px] font-bold font-mono text-cyan-400">
                {gameState?.currentGravityMs ? `${gameState.currentGravityMs}ms` : '700ms'}
              </div>
              {telemetry && telemetry.combo > 0 && (
                <div className="text-[9px] text-pink-400 font-black animate-pulse">×{telemetry.combo} COMBO</div>
              )}
            </div>
          </div>

          {/* Matrix Canvas Principal */}
          <div className="relative">
            <div
              className={`relative rounded-2xl overflow-hidden border-2 bg-[#070913] transition-transform duration-100 shadow-[0_0_30px_rgba(0,0,0,0.8)] ${
                hpFlash
                  ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)]'
                  : isDanger
                  ? 'border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                  : 'border-slate-800/80'
              } ${isShaking ? 'translate-y-1.5 -translate-x-1' : ''}`}
            >
              <canvas
                ref={matrixCanvasRef}
                width={COLS * BLOCK_SIZE}
                height={ROWS * BLOCK_SIZE}
                className="block"
              />

              {/* Action Text Banner */}
              {actionText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="text-lg font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 animate-bounce px-4 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,242,254,0.6)] text-center">
                    {actionText}
                  </div>
                </div>
              )}

              {/* Game Over Screen quando HP zera */}
              {gameState?.isGameOver && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 animate-in fade-in duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                    <Skull size={32} />
                  </div>
                  <h3 className="text-xl font-black text-rose-400 tracking-wider">ELIMINADO!</h3>
                  <p className="text-xs font-mono text-slate-300 text-center max-w-[200px]">
                    Seu HP zerou no Andar {currentFloor}.
                  </p>
                  <button
                    onClick={() => {
                      matchProcessedRef.current = false;
                      engineRef.current?.init();
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-bold font-mono text-xs tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Next Queue */}
          <div className="flex flex-col gap-2 w-[100px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
              <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">NEXT</div>
              <canvas ref={nextCanvasRef} width={100} height={300} className="block" />
            </div>

            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                audio.enabled = nextState;
              }}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center gap-1 text-[10px] font-mono"
            >
              {soundEnabled ? <Volume2 size={14} className="text-cyan-400" /> : <VolumeX size={14} />}
              <span>{soundEnabled ? 'SOM ON' : 'MUDO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── PAINEL DINÂMICO DE ANDARES (FLOOR SYSTEM SIDE PANEL) ── */}
      <div className="w-full xl:w-[320px] bg-slate-900/85 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-4 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Layers size={18} className="text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white font-mono tracking-wider">TORRE DE ANDARES</h3>
              <span className="text-[10px] font-mono text-cyan-400">Multiplayer Contínuo</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{allPlayersInFloors.length} Jogando</span>
          </div>
        </div>

        {/* Lista Dinâmica de Andares (de cima para baixo) */}
        <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
          {floorLevels.map((floorNum) => {
            const playersAtThisFloor = allPlayersInFloors.filter(p => p.floor === floorNum);
            const isMyFloor = currentFloor === floorNum;

            return (
              <div
                key={floorNum}
                className={`rounded-2xl p-2.5 transition-all duration-200 border ${
                  isMyFloor
                    ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_15px_rgba(0,242,254,0.15)] ring-1 ring-cyan-400/40'
                    : playersAtThisFloor.length > 0
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-950/30 border-slate-900/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                      isMyFloor
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      ANDAR {floorNum}
                    </span>
                    {floorNum >= 10 && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-0.5">
                        <Zap size={10} /> Rápido
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {playersAtThisFloor.length} {playersAtThisFloor.length === 1 ? 'jogador' : 'jogadores'}
                  </span>
                </div>

                {/* Jogadores presentes neste andar */}
                {playersAtThisFloor.length > 0 ? (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {playersAtThisFloor.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-1.5 rounded-xl text-xs font-mono border ${
                          p.isYou
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-900/90 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isAlive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                          <span className="font-bold truncate">{p.username}</span>
                        </div>

                        {/* Barra de Vida Mini */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full ${
                                p.hp > 50 ? 'bg-emerald-400' : p.hp > 25 ? 'bg-amber-400' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(0, p.hp)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${
                            p.hp > 25 ? 'text-slate-300' : 'text-rose-400'
                          }`}>
                            {p.hp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-slate-600 pl-1 italic">
                    Nenhum jogador no andar
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Miniaturas de Oponentes Conectados */}
        {multiplayer.opponents.length > 0 && (
          <div className="mt-2 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-bold font-mono text-slate-400 mb-2 flex items-center justify-between">
              <span>OPONENTES ATIVOS</span>
              <span className="text-cyan-400">{multiplayer.opponents.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
              {multiplayer.opponents.map((op) => (
                <OpponentMatrixThumbnail
                  key={op.id}
                  opponent={op}
                  isTarget={multiplayer.currentTargetId === op.id}
                  onSelectTarget={(id) => multiplayer.setTarget(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
