import { GameState, Enemy, Vector2, PickupItem } from './types';
import { addEffect } from './effects';

let enemyIdCounter = 0;
let spawnTimer = 0;
let orbIdCounter = 0;
let pickupIdCounter = 0;
const HUANG_LONG_HEAL_INTERVAL = 100;

const EXP_DROP_CONFIG = {
  basic: { value: 1, chance: 0.7, color: '#00ffcc' },
  armored: { value: 3, chance: 0.65, color: '#00ccff' },
  elite: { value: 20, chance: 1, color: '#ffcc00' },
} as const;

const ITEM_DROP_MAGNET_CHANCE = 0.04;
const ITEM_DROP_HEAL_CHANCE = 0.03;

export function getKnockbackMultiplier(enemy: Enemy): number {
  return 1 - enemy.knockbackResist;
}

export function updateEnemies(state: GameState, dt: number) {
  spawnTimer += dt;
  const spawnRate = Math.max(0.1, 1.0 - state.time * 0.002);

  if (spawnTimer > spawnRate && state.enemies.length < 300) {
    spawnTimer = 0;
    spawnEnemy(state);
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];

    if (enemy.stunTimer > 0) enemy.stunTimer -= dt;
    if (enemy.slowTimer > 0) enemy.slowTimer -= dt;

    if (enemy.burnStacks > 0) {
      enemy.burnTimer -= dt;
      if (enemy.burnTimer <= 0) {
        enemy.burnTimer = 0.5;
        const dmg = enemy.burnStacks * 2;
        enemy.hp -= dmg;
        addEffect(state, { pos: { ...enemy.pos }, type: 'damage_text', life: 0.5, maxLife: 0.5, color: '#ff6600', size: 14, text: Math.floor(dmg).toString() });
      }
    }

    if (enemy.hp <= 0) {
      killEnemy(state, i);
      continue;
    }

    if (enemy.stunTimer <= 0) {
      const dx = state.player.pos.x - enemy.pos.x;
      const dy = state.player.pos.y - enemy.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        let currentSpeed = enemy.speed;
        if (enemy.slowTimer > 0) currentSpeed *= 0.5;

        enemy.pos.x += (dx / dist) * currentSpeed * dt;
        enemy.pos.y += (dy / dist) * currentSpeed * dt;
      }
    }

    enemy.pos.x += enemy.knockback.x * dt;
    enemy.pos.y += enemy.knockback.y * dt;
    enemy.knockback.x *= Math.pow(0.1, dt);
    enemy.knockback.y *= Math.pow(0.1, dt);

    const pdx = state.player.pos.x - enemy.pos.x;
    const pdy = state.player.pos.y - enemy.pos.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pdist < state.player.radius + enemy.radius && state.player.invincibleTimer <= 0) {
      const dmg = 1;
      state.player.hp -= dmg;
      state.player.invincibleTimer = 0.55;
      state.hitFlashTimer = 0.4;
      state.screenShake = 14;
      state.hudVersion++;

      addEffect(state, {
        pos: { x: state.player.pos.x, y: state.player.pos.y - state.player.radius - 4 },
        type: 'damage_text',
        color: '#ff3333',
        life: 0.75,
        maxLife: 0.75,
        size: 22,
        text: `-${dmg}`,
      });
      addEffect(state, {
        pos: { ...state.player.pos },
        type: 'hit_burst',
        color: '#ff4444',
        life: 0.4,
        maxLife: 0.4,
        size: state.player.radius * 1.5,
      });
      addEffect(state, {
        pos: { ...state.player.pos },
        type: 'circle',
        color: '#ff0000',
        life: 0.25,
        maxLife: 0.25,
        size: state.player.radius,
      });
    }
  }
}

function spawnEnemy(state: GameState) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.max(state.canvasWidth, state.canvasHeight) * 0.7;
  const x = state.player.pos.x + Math.cos(angle) * dist;
  const y = state.player.pos.y + Math.sin(angle) * dist;

  let type: Enemy['type'] = 'basic';
  let color = '#888888';
  let hp = 6 + state.time * 0.15;
  let speed = 90 + Math.random() * 25;
  let radius = 10;
  let damage = 5;
  let knockbackResist = 0;

  const rand = Math.random();
  if (state.time > 120 && rand < 0.05) {
    type = 'elite';
    color = '#8a2be2';
    hp = 120 + state.time * 2.5;
    speed = 50 + Math.random() * 15;
    radius = 22;
    damage = 20;
    knockbackResist = 0.5;
  } else if (state.time > 60 && rand < 0.25) {
    type = 'armored';
    color = '#2f4f4f';
    hp = 30 + state.time * 0.6;
    speed = 42 + Math.random() * 12;
    radius = 16;
    damage = 10;
    knockbackResist = 0.75;
  }

  state.enemies.push({
    id: enemyIdCounter++,
    pos: { x, y },
    hp, maxHp: hp,
    speed, radius, type, color, damage,
    knockback: { x: 0, y: 0 },
    stunTimer: 0,
    burnStacks: 0,
    burnTimer: 0,
    slowTimer: 0,
    knockbackResist,
  });
}

function dropExp(state: GameState, enemy: Enemy, pos: Vector2) {
  const cfg = EXP_DROP_CONFIG[enemy.type];
  if (Math.random() >= cfg.chance) return;

  state.expOrbs.push({
    id: orbIdCounter++,
    pos: { ...pos },
    value: cfg.value,
    radius: Math.min(12, 4 + cfg.value * 0.5),
    color: cfg.color,
  });
}

function tryDropItem(state: GameState, pos: Vector2) {
  const roll = Math.random();
  let type: PickupItem['type'] | null = null;

  if (roll < ITEM_DROP_MAGNET_CHANCE) {
    type = 'magnet';
  } else if (roll < ITEM_DROP_MAGNET_CHANCE + ITEM_DROP_HEAL_CHANCE) {
    type = 'heal';
  }

  if (!type) return;

  state.pickups.push({
    id: pickupIdCounter++,
    pos: { ...pos },
    type,
    radius: type === 'magnet' ? 11 : 12,
    color: type === 'magnet' ? '#a78bfa' : '#22c55e',
  });
}

function killEnemy(state: GameState, index: number) {
  const enemy = state.enemies[index];
  state.kills++;
  state.hudVersion++;

  if (
    state.player.weapons.includes('황룡') &&
    state.kills > 0 &&
    state.kills % HUANG_LONG_HEAL_INTERVAL === 0
  ) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
    state.hudVersion++;
    addEffect(state, {
      pos: { x: state.player.pos.x, y: state.player.pos.y - state.player.radius - 12 },
      type: 'damage_text',
      color: '#22ff66',
      life: 1.0,
      maxLife: 1.0,
      size: 20,
      text: '+1 HP',
    });
    addEffect(state, {
      pos: { ...state.player.pos },
      type: 'gold_flash',
      color: '#ffd700',
      life: 0.5,
      maxLife: 0.5,
      size: state.player.radius * 3,
    });
  }

  dropExp(state, enemy, enemy.pos);
  tryDropItem(state, enemy.pos);

  state.enemies.splice(index, 1);
}
