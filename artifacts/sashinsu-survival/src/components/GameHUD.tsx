import { GameState } from '../game/types';
import { WEAPON_DEFS } from '../game/weapons';
import { BUFF_DEFS } from '../game/buffs';

export function GameHUD({ state }: { state: GameState }) {
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const hpPct = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  const expPct = Math.max(0, state.player.exp / state.player.expToNext) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-white font-bold text-lg drop-shadow-md">
            <span>LV. {state.player.level}</span>
            <span>{Math.floor(state.player.hp)} / {state.player.maxHp}</span>
          </div>
          <div className="h-4 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 bg-red-600 transition-all" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="h-2 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-blue-400 transition-all" style={{ width: `${expPct}%` }} />
          </div>
        </div>
        
        <div className="text-right space-y-1 drop-shadow-md">
          <div className="text-3xl font-mono text-white font-bold">{formatTime(state.time)}</div>
          <div className="text-lg text-gray-300">Kills: <span className="text-white">{state.kills}</span></div>
        </div>
      </div>

      {/* Bottom Bar: Owned Items */}
      <div className="flex gap-2">
        {state.player.weapons.map(w => {
          const def = WEAPON_DEFS[w as keyof typeof WEAPON_DEFS];
          return (
            <div key={w} className="w-10 h-10 rounded-md border border-gray-600 shadow-md" style={{ background: def?.iconColor || '#333' }} title={w} />
          )
        })}
        <div className="w-px h-10 bg-gray-600 mx-2" />
        {state.player.buffs.map(b => {
          const def = BUFF_DEFS[b as keyof typeof BUFF_DEFS];
          return (
            <div key={b} className="w-10 h-10 rounded-full border border-gray-600 shadow-md" style={{ background: def?.iconColor || '#333' }} title={b} />
          )
        })}
      </div>
    </div>
  );
}
