import { GameState, Upgrade } from '../game/types';

interface UpgradeScreenProps {
  state: GameState;
  onSelect: (upgrade: Upgrade) => void;
}

export function UpgradeScreen({ state, onSelect }: UpgradeScreenProps) {
  if (state.state !== 'LEVEL_UP') return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto z-50">
      <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-lg text-yellow-400">레벨 업!</h1>
      <div className="flex gap-6">
        {state.upgradesToChoose.map(u => {
          const borderClass = u.rarity === 'completed' ? 'border-yellow-400 shadow-yellow-500/50' 
            : u.rarity === 'hidden' ? 'border-purple-400 shadow-purple-500/50' 
            : 'border-gray-500 hover:border-gray-300';
            
          return (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className={`w-64 h-80 rounded-xl bg-gray-900 border-2 ${borderClass} flex flex-col items-center p-6 shadow-xl transition-transform hover:scale-105 hover:-translate-y-2`}
            >
              <div className="w-20 h-20 rounded-full mb-6 shadow-inner" style={{ background: u.iconColor }} />
              <h3 className="text-xl font-bold text-white mb-2 text-center">{u.name}</h3>
              <p className="text-sm text-gray-400 text-center leading-relaxed">{u.description}</p>
              
              <div className="mt-auto px-3 py-1 rounded bg-gray-800 text-xs font-mono text-gray-500 border border-gray-700">
                {u.type.toUpperCase()}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
