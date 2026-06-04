// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { GameState, Upgrade } from '../game/types';
import { createInitialState, gameUpdate, gameDraw } from '../game/engine';
import { GameHUD } from '../components/GameHUD';
import { UpgradeScreen } from '../components/UpgradeScreen';

type GamePhaseType = 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER';

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const [gamePhase, setGamePhase] = useState<GamePhaseType>('START');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const state = createInitialState(canvas.width, canvas.height);
    state.ctx = canvas.getContext('2d');
    stateRef.current = state;

    const handleKeyDown = (e: KeyboardEvent) => {
      state.keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.keys[e.key] = false;
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      state.canvasWidth = canvas.width;
      state.canvasHeight = canvas.height;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    let prevPhase = state.state;

    const loop = () => {
      if (!stateRef.current) return;
      const s = stateRef.current;

      gameUpdate(s);
      gameDraw(s);

      if (s.state !== prevPhase) {
        prevPhase = s.state;
        setGamePhase(s.state as 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER');
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStart = () => {
    const state = stateRef.current;
    if (!state) return;
    state.state = 'PLAYING';
    state.lastTime = performance.now();
    setGamePhase('PLAYING' as GamePhaseType);
  };

  const handleRestart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelAnimationFrame(rafRef.current);

    const newState = createInitialState(canvas.width, canvas.height);
    newState.ctx = canvas.getContext('2d');
    newState.state = 'PLAYING';
    newState.lastTime = performance.now();
    stateRef.current = newState;

    let prevPhase = newState.state;
    const loop = () => {
      if (!stateRef.current) return;
      const s = stateRef.current;
      gameUpdate(s);
      gameDraw(s);
      if (s.state !== prevPhase) {
        prevPhase = s.state;
        setGamePhase(s.state as GamePhaseType);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    setGamePhase('PLAYING' as GamePhaseType);
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
          <p className="text-xl text-gray-400 mb-12">전설의 사신수 힘으로 끝없이 몰려오는 적들을 물리치세요.</p>
          <div className="text-sm text-gray-600 mb-8">WASD 또는 방향키로 이동</div>
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

      {gamePhase === 'PLAYING' && state && (
        <GameHUD state={state} />
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
            다시 시작
          </button>
        </div>
      )}
    </div>
  );
}
