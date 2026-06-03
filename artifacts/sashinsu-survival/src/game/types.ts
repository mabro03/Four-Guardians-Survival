export type Vector2 = { x: number; y: number };

export interface Player {
  pos: Vector2;
  dir: Vector2; // Last movement direction
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  weapons: string[];
  buffs: string[];
  level: number;
  exp: number;
  expToNext: number;
}

export interface Enemy {
  id: number;
  pos: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  type: 'basic' | 'armored' | 'elite';
  color: string;
  damage: number;
  knockback: Vector2;
  stunTimer: number;
  burnStacks: number;
  burnTimer: number;
  slowTimer: number;
}

export interface Projectile {
  id: number;
  pos: Vector2;
  dir: Vector2;
  speed: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  type: string;
  color: string;
  pierce: number;
  hitEnemies: Set<number>;
}

export interface ExpOrb {
  id: number;
  pos: Vector2;
  value: number;
  radius: number;
  color: string;
  target?: Player;
}

export interface VisualEffect {
  id: number;
  pos: Vector2;
  type: string;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  angle?: number;
  text?: string;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'buff' | 'completed';
  iconColor: string;
  rarity: 'base' | 'completed' | 'hidden';
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  expOrbs: ExpOrb[];
  effects: VisualEffect[];
  camera: Vector2;
  time: number; 
  kills: number;
  state: 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER';
  keys: { [key: string]: boolean };
  upgradesToChoose: Upgrade[];
  lastTime: number;
  frameId: number;
  ctx: CanvasRenderingContext2D | null;
  canvasWidth: number;
  canvasHeight: number;
}
