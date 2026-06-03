import { GameState } from './types';
import { updateEnemies } from './enemies';
import { updateWeapons, WEAPON_DEFS } from './weapons';
import { updateEffects, drawEffects } from './effects';
import { BUFF_DEFS, getPlayerSpeedMultiplier } from './buffs';

export function createInitialState(canvasWidth: number, canvasHeight: number): GameState {
  return {
    player: {
      pos: { x: 0, y: 0 },
      dir: { x: 1, y: 0 },
      hp: 100, maxHp: 100,
      speed: 150, radius: 15,
      weapons: [],
      buffs: [],
      level: 1, exp: 0, expToNext: 10
    },
    enemies: [], projectiles: [], expOrbs: [], effects: [],
    camera: { x: 0, y: 0 },
    time: 0, kills: 0,
    state: 'START',
    keys: {},
    upgradesToChoose: [],
    lastTime: performance.now(),
    frameId: 0,
    ctx: null,
    canvasWidth, canvasHeight
  };
}

export function gameUpdate(state: GameState) {
  if (state.state !== 'PLAYING') return;

  const now = performance.now();
  const dt = Math.min((now - state.lastTime) / 1000, 0.1);
  state.lastTime = now;
  state.time += dt;

  // Player Movement
  let dx = 0, dy = 0;
  if (state.keys['w'] || state.keys['ArrowUp']) dy -= 1;
  if (state.keys['s'] || state.keys['ArrowDown']) dy += 1;
  if (state.keys['a'] || state.keys['ArrowLeft']) dx -= 1;
  if (state.keys['d'] || state.keys['ArrowRight']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    state.player.dir = { x: dx, y: dy };
    const spd = state.player.speed * getPlayerSpeedMultiplier(state.player.weapons, state.player.buffs);
    state.player.pos.x += dx * spd * dt;
    state.player.pos.y += dy * spd * dt;
  }

  updateEnemies(state, dt);
  updateWeapons(state, dt);
  updateEffects(state, dt);

  // Exp collection
  for (let i = state.expOrbs.length - 1; i >= 0; i--) {
    const orb = state.expOrbs[i];
    const odx = orb.pos.x - state.player.pos.x;
    const ody = orb.pos.y - state.player.pos.y;
    const dist = Math.sqrt(odx * odx + ody * ody);

    if (dist < 120) orb.target = state.player;

    if (orb.target) {
      const tdx = orb.target.pos.x - orb.pos.x;
      const tdy = orb.target.pos.y - orb.pos.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist < state.player.radius + orb.radius) {
        state.player.exp += orb.value;
        state.expOrbs.splice(i, 1);
        checkLevelUp(state);
      } else {
        orb.pos.x += (tdx / tdist) * 320 * dt;
        orb.pos.y += (tdy / tdist) * 320 * dt;
      }
    }
  }

  // Camera
  state.camera.x = state.player.pos.x - state.canvasWidth / 2;
  state.camera.y = state.player.pos.y - state.canvasHeight / 2;

  // Death
  if (state.player.hp <= 0) {
    state.state = 'GAME_OVER';
  }
}

function checkLevelUp(state: GameState) {
  while (state.player.exp >= state.player.expToNext) {
    state.player.exp -= state.player.expToNext;
    state.player.level++;
    state.player.expToNext = Math.floor(state.player.expToNext * 1.5);
    triggerLevelUp(state);
    break; // process one level at a time
  }
}

const COMPLETED_WEAPON_COMBOS: { id: string; requires: { weapon: string; buff: string } }[] = [
  { id: '청룡', requires: { weapon: '뇌명의 창', buff: '하늘의 파편' } },
  { id: '현무', requires: { weapon: '세계수의 나뭇가지', buff: '맥동하는 암석' } },
  { id: '주작', requires: { weapon: '공허한 화령의 그릇', buff: '영원의 불꽃' } },
  { id: '백호', requires: { weapon: '만파식적', buff: '태풍의 눈' } },
];

function triggerLevelUp(state: GameState) {
  const { player } = state;
  const options = [];

  // Check for completed weapons the player can unlock
  for (const combo of COMPLETED_WEAPON_COMBOS) {
    if (
      player.weapons.includes(combo.requires.weapon) &&
      player.buffs.includes(combo.requires.buff) &&
      !player.weapons.includes(combo.id)
    ) {
      const def = WEAPON_DEFS[combo.id];
      if (def) options.push({ ...def, type: 'completed' as const });
    }
  }

  // Check for 황룡 unlock (all 4 completed weapons)
  const allCompleted = ['청룡', '현무', '주작', '백호'];
  if (
    allCompleted.every(w => player.weapons.includes(w)) &&
    !player.weapons.includes('황룡')
  ) {
    const def = WEAPON_DEFS['황룡'];
    if (def) options.push({ ...def, type: 'completed' as const });
  }

  // Add base weapons not yet owned
  const baseWeapons = ['뇌명의 창', '세계수의 나뭇가지', '공허한 화령의 그릇', '만파식적'];
  for (const wId of baseWeapons) {
    if (!player.weapons.includes(wId)) {
      const def = WEAPON_DEFS[wId];
      if (def) options.push({ ...def, type: 'weapon' as const });
    }
  }

  // Add buffs not yet owned
  for (const [bId, def] of Object.entries(BUFF_DEFS)) {
    if (!player.buffs.includes(bId)) {
      options.push({ ...def, type: 'buff' as const });
    }
  }

  const shuffled = options.sort(() => Math.random() - 0.5);

  // Prioritize completed weapons in the selection
  const completedOptions = shuffled.filter(o => o.rarity === 'completed' || o.rarity === 'hidden');
  const otherOptions = shuffled.filter(o => o.rarity === 'base');

  const selected = [...completedOptions.slice(0, 2), ...otherOptions].slice(0, 3);

  if (selected.length === 0) {
    // Nothing to offer — just heal
    player.maxHp += 20;
    player.hp = Math.min(player.hp + 30, player.maxHp);
    return;
  }

  state.upgradesToChoose = selected;
  state.state = 'LEVEL_UP';
}

const huangLongAngle = { val: 0 };

export function gameDraw(state: GameState) {
  const ctx = state.ctx;
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#0a0a15';
  ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  // Grid
  ctx.strokeStyle = '#141428';
  ctx.lineWidth = 1;
  const step = 80;
  const startX = Math.floor(state.camera.x / step) * step;
  const startY = Math.floor(state.camera.y / step) * step;
  for (let x = startX; x < startX + state.canvasWidth + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, state.camera.y);
    ctx.lineTo(x, state.camera.y + state.canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < startY + state.canvasHeight + step; y += step) {
    ctx.beginPath();
    ctx.moveTo(state.camera.x, y);
    ctx.lineTo(state.camera.x + state.canvasWidth, y);
    ctx.stroke();
  }

  // Exp Orbs
  for (const orb of state.expOrbs) {
    ctx.fillStyle = orb.color;
    ctx.shadowColor = orb.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(orb.pos.x, orb.pos.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Enemies
  for (const enemy of state.enemies) {
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.type === 'elite' ? 18 : 4;
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = '#300';
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius - 8, enemy.radius * 2, 4);
      ctx.fillStyle = '#f55';
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius - 8, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 4);
    }

    if (enemy.stunTimer > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (enemy.burnStacks > 0) {
      ctx.fillStyle = `rgba(255,${Math.min(100, enemy.burnStacks * 5)},0,0.6)`;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Projectiles
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Effects (zones, rings, damage numbers etc.)
  drawEffects(state, ctx);

  // 황룡 dragon orbit
  if (state.player.weapons.includes('황룡')) {
    huangLongAngle.val += 0.02;
    const dragonR = 100;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2 + huangLongAngle.val;
      const r = dragonR + Math.sin(a * 3) * 20;
      const x = state.player.pos.x + Math.cos(a) * r;
      const y = state.player.pos.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Player
  const pGrad = ctx.createRadialGradient(state.player.pos.x, state.player.pos.y, 0, state.player.pos.x, state.player.pos.y, state.player.radius * 2);
  pGrad.addColorStop(0, '#ffffff');
  pGrad.addColorStop(0.5, '#aaccff');
  pGrad.addColorStop(1, '#ffffff00');
  ctx.fillStyle = pGrad;
  ctx.shadowColor = '#aaf';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}
