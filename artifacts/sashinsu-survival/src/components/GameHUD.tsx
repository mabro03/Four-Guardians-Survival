import { GameState } from '../game/types';
import { WEAPON_DEFS } from '../game/weapons';
import { BUFF_DEFS } from '../game/buffs';

export function GameHUD({ state, hudTick }: { state: GameState; hudTick?: number }) {
  void hudTick;
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const hpPct = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  const expPct = Math.max(0, state.player.exp / state.player.expToNext) * 100;
  const isHurt = state.hitFlashTimer > 0;
  const isExpPulse = state.expPulseTimer > 0;
  const isLowHp = hpPct <= 30;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between select-none">
      {/* Hit flash overlay */}
      {isHurt && (
        <div
          className="absolute inset-0 z-40"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,40,40,${(state.hitFlashTimer / 0.4) * 0.15}) 0%, rgba(180,0,0,${(state.hitFlashTimer / 0.4) * 0.45}) 100%)`,
          }}
        />
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-start z-50">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-white font-bold text-lg drop-shadow-md">
            <span>LV. {state.player.level}</span>
            <span className={isHurt ? 'text-red-400' : ''}>
              {Math.ceil(state.player.hp)} / {state.player.maxHp}
            </span>
          </div>

          {/* HP Bar */}
          <div
            className={`h-5 bg-gray-900 rounded-full border overflow-hidden relative ${
              isHurt ? 'border-red-500' : isLowHp ? 'border-red-700' : 'border-gray-700'
            }`}
            style={isHurt ? { boxShadow: '0 0 12px rgba(255,60,60,0.8)' } : undefined}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${hpPct}%`,
                background: isLowHp
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : 'linear-gradient(90deg, #b91c1c, #ef4444)',
                transition: 'width 80ms linear',
              }}
            />
            {isHurt && (
              <div
                className="absolute inset-0 bg-red-500/30"
                style={{ animation: 'pulse 0.3s ease-out' }}
              />
            )}
          </div>

          {/* EXP Bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>EXP</span>
              <span className={isExpPulse ? 'text-yellow-300 font-bold' : ''}>
                {state.player.exp} / {state.player.expToNext}
              </span>
            </div>
            <div
              className={`h-3 bg-gray-900 rounded-full border overflow-hidden relative ${
                isExpPulse ? 'border-yellow-400' : 'border-gray-700'
              }`}
              style={isExpPulse ? { boxShadow: '0 0 10px rgba(250,204,21,0.7)' } : undefined}
            >
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${expPct}%`,
                  background: 'linear-gradient(90deg, #facc15, #60a5fa)',
                  transition: 'width 80ms linear',
                }}
              />
              {isExpPulse && (
                <div
                  className="absolute inset-0 bg-yellow-300/40"
                  style={{ animation: 'pulse 0.4s ease-out' }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="text-right space-y-1 drop-shadow-md">
          <div className="text-3xl font-mono text-white font-bold">{formatTime(state.time)}</div>
          <div className="text-lg text-gray-300">Kills: <span className="text-white">{state.kills}</span></div>
          {state.magnetTimer > 0 && (
            <div className="text-sm text-purple-300 font-bold">
              자석 {Math.ceil(state.magnetTimer)}초
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Owned Items */}
      <div className="flex gap-2 z-50">
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
