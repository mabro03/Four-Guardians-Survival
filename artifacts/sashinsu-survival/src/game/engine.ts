import { GameState, Difficulty, getDifficultyHp } from './types';
import { updateEnemies } from './enemies';
import { updateWeapons, WEAPON_DEFS } from './weapons';
import { updateEffects, drawEffects, addEffect } from './effects';
import { BUFF_DEFS, getPlayerSpeedMultiplier } from './buffs';

// 기본 무기 목록
const BASE_WEAPONS = ['뇌명의 창', '세계수의 나뭇가지', '공허한 화령의 그릇', '만파식적'];

export function createInitialState(
  canvasWidth: number,
  canvasHeight: number,
  difficulty: Difficulty = 'normal',
): GameState {
  // 기본 무기 중 하나를 무작위로 선택
  const randomBaseWeapon = BASE_WEAPONS[Math.floor(Math.random() * BASE_WEAPONS.length)];
  const maxHp = getDifficultyHp(difficulty);

  return {
    player: {
      pos: { x: 0, y: 0 },
      dir: { x: 1, y: 0 },
      hp: maxHp, maxHp,
      speed: 150, radius: 15,
      weapons: [randomBaseWeapon],
      buffs: [],
      level: 1, exp: 0, expToNext: 10,
      invincibleTimer: 0,
    },
    enemies: [], projectiles: [], expOrbs: [], pickups: [], effects: [],
    camera: { x: 0, y: 0 },
    time: 0, kills: 0,
    state: 'START',
    keys: {},
    upgradesToChoose: [],
    lastTime: performance.now(),
    frameId: 0,
    ctx: null,
    canvasWidth, canvasHeight,
    hitFlashTimer: 0,
    screenShake: 0,
    expPulseTimer: 0,
    hudVersion: 0,
    difficulty,
    magnetTimer: 0,
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

  if (state.player.invincibleTimer > 0) state.player.invincibleTimer -= dt;
  if (state.hitFlashTimer > 0) state.hitFlashTimer -= dt;
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 50);
  if (state.expPulseTimer > 0) state.expPulseTimer -= dt;
  if (state.magnetTimer > 0) state.magnetTimer -= dt;

  updateEnemies(state, dt);
  updateWeapons(state, dt);
  updateEffects(state, dt);

  // Exp collection
  const magnetRange = state.magnetTimer > 0 ? 420 : 120;
  const magnetPullSpeed = state.magnetTimer > 0 ? 480 : 320;

  for (let i = state.expOrbs.length - 1; i >= 0; i--) {
    const orb = state.expOrbs[i];
    const odx = orb.pos.x - state.player.pos.x;
    const ody = orb.pos.y - state.player.pos.y;
    const dist = Math.sqrt(odx * odx + ody * ody);

    if (dist < magnetRange) orb.target = state.player;

    if (orb.target) {
      const tdx = orb.target.pos.x - orb.pos.x;
      const tdy = orb.target.pos.y - orb.pos.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist < state.player.radius + orb.radius) {
        state.player.exp += orb.value;
        state.expPulseTimer = 0.6;
        state.hudVersion++;
        state.expOrbs.splice(i, 1);

        addEffect(state, {
          pos: { x: state.player.pos.x, y: state.player.pos.y - state.player.radius - 8 },
          type: 'exp_text',
          color: orb.color,
          life: 0.9,
          maxLife: 0.9,
          size: 18,
          text: `+${orb.value} EXP`,
        });
        addEffect(state, {
          pos: { ...orb.pos },
          type: 'exp_burst',
          color: orb.color,
          life: 0.45,
          maxLife: 0.45,
          size: orb.radius * 3,
        });

        checkLevelUp(state);
      } else {
        orb.pos.x += (tdx / tdist) * magnetPullSpeed * dt;
        orb.pos.y += (tdy / tdist) * magnetPullSpeed * dt;
      }
    }
  }

  // Pickup collection
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pickup = state.pickups[i];
    const pdx = pickup.pos.x - state.player.pos.x;
    const pdy = pickup.pos.y - state.player.pos.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pdist < state.player.radius + pickup.radius + 20) {
      if (pickup.type === 'magnet') {
        state.magnetTimer = 10;
        addEffect(state, {
          pos: { x: state.player.pos.x, y: state.player.pos.y - state.player.radius - 8 },
          type: 'exp_text',
          color: '#a78bfa',
          life: 1.0,
          maxLife: 1.0,
          size: 18,
          text: '자석!',
        });
      } else if (pickup.type === 'heal') {
        const healed = Math.min(10, state.player.maxHp - state.player.hp);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 10);
        state.hudVersion++;
        addEffect(state, {
          pos: { x: state.player.pos.x, y: state.player.pos.y - state.player.radius - 8 },
          type: 'damage_text',
          color: '#22ff66',
          life: 1.0,
          maxLife: 1.0,
          size: 20,
          text: healed > 0 ? '+10 HP' : 'MAX HP',
        });
        addEffect(state, {
          pos: { ...state.player.pos },
          type: 'gold_flash',
          color: '#22ff66',
          life: 0.4,
          maxLife: 0.4,
          size: state.player.radius * 2.5,
        });
      }
      state.pickups.splice(i, 1);
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
    state.hudVersion++;
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
  if (state.screenShake > 0) {
    const shake = state.screenShake;
    ctx.translate(
      (Math.random() - 0.5) * shake * 2,
      (Math.random() - 0.5) * shake * 2,
    );
  }
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

  // Pickups
  for (const pickup of state.pickups) {
    ctx.save();
    ctx.shadowColor = pickup.color;
    ctx.shadowBlur = 14;

    if (pickup.type === 'magnet') {
      ctx.fillStyle = pickup.color;
      ctx.beginPath();
      ctx.arc(pickup.pos.x, pickup.pos.y, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', pickup.pos.x, pickup.pos.y);
    } else {
      ctx.fillStyle = pickup.color;
      ctx.beginPath();
      ctx.arc(pickup.pos.x, pickup.pos.y, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', pickup.pos.x, pickup.pos.y);
    }

    ctx.restore();
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
  const isBlinking = state.player.invincibleTimer > 0 && Math.floor(state.player.invincibleTimer * 12) % 2 === 0;
  if (!isBlinking) {
    const isHurt = state.player.invincibleTimer > 0;
    const pGrad = ctx.createRadialGradient(state.player.pos.x, state.player.pos.y, 0, state.player.pos.x, state.player.pos.y, state.player.radius * 2);
    pGrad.addColorStop(0, isHurt ? '#ffcccc' : '#ffffff');
    pGrad.addColorStop(0.5, isHurt ? '#ff6666' : '#aaccff');
    pGrad.addColorStop(1, '#ffffff00');
    ctx.fillStyle = pGrad;
    ctx.shadowColor = isHurt ? '#f44' : '#aaf';
    ctx.shadowBlur = isHurt ? 28 : 20;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isHurt) {
      ctx.strokeStyle = '#ff444488';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Screen-space hit flash overlay
  if (state.hitFlashTimer > 0) {
    const alpha = (state.hitFlashTimer / 0.4) * 0.5;
    const grad = ctx.createRadialGradient(
      state.canvasWidth / 2, state.canvasHeight / 2, state.canvasHeight * 0.2,
      state.canvasWidth / 2, state.canvasHeight / 2, state.canvasHeight * 0.75,
    );
    grad.addColorStop(0, `rgba(255, 40, 40, ${alpha * 0.3})`);
    grad.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
  }
}
