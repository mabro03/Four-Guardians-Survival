// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { GameState, Upgrade, Difficulty, DIFFICULTY_CONFIG } from '../game/types';
import { createInitialState, gameUpdate, gameDraw } from '../game/engine';
import { GameHUD } from '../components/GameHUD';
import { UpgradeScreen } from '../components/UpgradeScreen';

type GamePhaseType = 'START' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER';

async function requestGameFullscreen() {
  try {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen();
    }
  } catch {
    // 브라우저 정책으로 실패할 수 있음
  }
}

function syncCanvasSize(canvas: HTMLCanvasElement, state: GameState) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  state.canvasWidth = canvas.width;
  state.canvasHeight = canvas.height;
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const [gamePhase, setGamePhase] = useState<GamePhaseType>('START');
  const [hudTick, setHudTick] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const state = createInitialState(canvas.width, canvas.height);
    state.ctx = canvas.getContext('2d');
    stateRef.current = state;

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (s.state === 'PLAYING') {
          s.state = 'PAUSED';
          s.keys = {};
        } else if (s.state === 'PAUSED') {
          s.state = 'PLAYING';
          s.lastTime = performance.now();
        }
        return;
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
      }
      s.keys[key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      s.keys[key] = false;
    };
    const handleResize = () => {
      const s = stateRef.current;
      if (!s) return;
      syncCanvasSize(canvas, s);
    };
    const handleFullscreenChange = () => {
      const s = stateRef.current;
      if (!s) return;
      syncCanvasSize(canvas, s);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    let prevPhase = state.state;
    let prevHudVersion = state.hudVersion;
    let lastHudRefresh = performance.now();

    const loop = () => {
      if (!stateRef.current) return;
      const s = stateRef.current;

      gameUpdate(s);
      gameDraw(s);

      if (s.state !== prevPhase) {
        prevPhase = s.state;
        setGamePhase(s.state as GamePhaseType);
      }

      const now = performance.now();
      if (
        s.hudVersion !== prevHudVersion ||
        ((s.state === 'PLAYING' || s.state === 'PAUSED') && now - lastHudRefresh > 100)
      ) {
        prevHudVersion = s.hudVersion;
        lastHudRefresh = now;
        setHudTick(t => t + 1);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStart = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await requestGameFullscreen();

    const newState = createInitialState(canvas.width, canvas.height, selectedDifficulty);
    newState.ctx = canvas.getContext('2d');
    syncCanvasSize(canvas, newState);
    newState.state = 'PLAYING';
    newState.lastTime = performance.now();
    stateRef.current = newState;
    setGamePhase('PLAYING' as GamePhaseType);
  };

  const handleRestart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newState = createInitialState(canvas.width, canvas.height);
    newState.ctx = canvas.getContext('2d');
    newState.state = 'START';
    stateRef.current = newState;
    setGamePhase('START' as GamePhaseType);
  };

  const handleUpgradeSelect = (u: Upgrade) => {
    const state = stateRef.current;
    if (!state) return;
    if (u.type === 'weapon' || u.type === 'completed') {
      state.player.weapons.push(u.id);
    } else if (u.type === 'buff') {
      state.player.buffs.push(u.id);
    }
    state.state = 'PLAYING';
    state.lastTime = performance.now();
    setGamePhase('PLAYING' as GamePhaseType);
  };

  const state = stateRef.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {gamePhase === 'START' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <h1
            className="text-6xl font-bold text-yellow-500 mb-4"
            style={{ textShadow: '0 0 30px rgba(234,179,8,0.7), 0 0 60px rgba(234,179,8,0.3)' }}
          >
            사신수 서바이벌
          </h1>
          <p className="text-xl text-gray-400 mb-8">전설의 사신수 힘으로 끝없이 몰려오는 적들을 물리치세요.</p>

          <div className="w-72 mb-8 space-y-2">
            <p className="text-sm text-gray-500 text-center mb-3">난이도 선택</p>
            {DIFFICULTY_CONFIG.map((d) => {
              const isSelected = selectedDifficulty === d.id;
              const colors: Record<Difficulty, string> = {
                easy: 'border-green-500 bg-green-950/40 hover:bg-green-900/50',
                normal: 'border-yellow-500 bg-yellow-950/40 hover:bg-yellow-900/50',
                hard: 'border-orange-500 bg-orange-950/40 hover:bg-orange-900/50',
                hardcore: 'border-red-500 bg-red-950/40 hover:bg-red-900/50',
              };
              const selectedColors: Record<Difficulty, string> = {
                easy: 'border-green-400 bg-green-900/60 ring-2 ring-green-500/50',
                normal: 'border-yellow-400 bg-yellow-900/60 ring-2 ring-yellow-500/50',
                hard: 'border-orange-400 bg-orange-900/60 ring-2 ring-orange-500/50',
                hardcore: 'border-red-400 bg-red-900/60 ring-2 ring-red-500/50',
              };
              return (
                <button
                  key={d.id}
                  data-testid={`button-difficulty-${d.id}`}
                  onClick={() => setSelectedDifficulty(d.id)}
                  className={`w-full px-5 py-3 rounded-lg border-2 text-left transition-all ${
                    isSelected ? selectedColors[d.id] : colors[d.id]
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">{d.label}</span>
                    <span className="text-gray-400 text-sm">HP {d.hp}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-sm text-gray-600 mb-8">WASD 또는 방향키로 이동 · ESC 일시정지</div>
          <button
            data-testid="button-start"
            onClick={handleStart}
            className="px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-full text-2xl transition-all hover:scale-105"
            style={{ boxShadow: '0 0 20px rgba(234,179,8,0.5)' }}
          >
            시작
          </button>
        </div>
      )}

      {(gamePhase === 'PLAYING' || gamePhase === 'PAUSED') && state && (
        <GameHUD state={state} hudTick={hudTick} />
      )}

      {gamePhase === 'PAUSED' && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 pointer-events-none">
          <h2 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">일시정지</h2>
          <p className="text-xl text-gray-300">ESC 키를 눌러 계속하기</p>
        </div>
      )}

      {gamePhase === 'LEVEL_UP' && state && (
        <UpgradeScreen state={state} onSelect={handleUpgradeSelect} />
      )}

      {gamePhase === 'GAME_OVER' && state && (
        <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-50">
          <h1
            className="text-8xl font-bold text-red-500 mb-8"
            style={{ textShadow: '0 0 30px rgba(239,68,68,0.8)' }}
          >
            사망
          </h1>
          <div className="text-2xl text-white mb-4">
            생존 시간: {Math.floor(state.time / 60).toString().padStart(2, '0')}:{Math.floor(state.time % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-2xl text-white mb-12">처치한 적: {state.kills}</div>
          <button
            data-testid="button-restart"
            onClick={handleRestart}
            className="px-10 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full text-xl transition-all hover:scale-105"
          >
            난이도 선택으로
          </button>
        </div>
      )}
    </div>
  );
}
