import { GameState, Enemy, Vector2 } from './types';
import { addEffect } from './effects';

let enemyIdCounter = 0;
let spawnTimer = 0;

export function updateEnemies(state: GameState, dt: number) {
  // Spawn logic
  spawnTimer += dt;
  const spawnRate = Math.max(0.1, 1.0 - state.time * 0.002);
  
  if (spawnTimer > spawnRate && state.enemies.length < 300) {
    spawnTimer = 0;
    spawnEnemy(state);
  }

  // Update logic
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    
    // Status effects
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
      // Movement
      const dx = state.player.pos.x - enemy.pos.x;
      const dy = state.player.pos.y - enemy.pos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0) {
        let currentSpeed = enemy.speed;
        if (enemy.slowTimer > 0) currentSpeed *= 0.5;
        
        enemy.pos.x += (dx / dist) * currentSpeed * dt;
        enemy.pos.y += (dy / dist) * currentSpeed * dt;
      }
    }

    // Knockback
    enemy.pos.x += enemy.knockback.x * dt;
    enemy.pos.y += enemy.knockback.y * dt;
    enemy.knockback.x *= Math.pow(0.1, dt);
    enemy.knockback.y *= Math.pow(0.1, dt);

    // Player collision
    const pdx = state.player.pos.x - enemy.pos.x;
    const pdy = state.player.pos.y - enemy.pos.y;
    const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
    if (pdist < state.player.radius + enemy.radius) {
      state.player.hp -= enemy.damage * dt;
    }
  }
}

function spawnEnemy(state: GameState) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.max(state.canvasWidth, state.canvasHeight) * 0.7;
  const x = state.player.pos.x + Math.cos(angle) * dist;
  const y = state.player.pos.y + Math.sin(angle) * dist;

  let type: 'basic' | 'armored' | 'elite' = 'basic';
  let color = '#888888';
  let hp = 10 + state.time * 0.5;
  let speed = 50 + Math.random() * 20;
  let radius = 12;
  let damage = 5;

  const rand = Math.random();
  if (state.time > 60 && rand < 0.2) {
    type = 'armored';
    color = '#2f4f4f';
    hp *= 3;
    speed *= 0.7;
    radius = 16;
    damage = 10;
  } else if (state.time > 120 && rand < 0.05) {
    type = 'elite';
    color = '#8a2be2';
    hp *= 10;
    speed *= 1.2;
    radius = 20;
    damage = 20;
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
    slowTimer: 0
  });
}

let orbIdCounter = 0;
function killEnemy(state: GameState, index: number) {
  const enemy = state.enemies[index];
  state.kills++;
  
  // Drop Exp
  let expValue = 1;
  let color = '#00ffcc';
  if (enemy.type === 'armored') { expValue = 3; color = '#00ccff'; }
  if (enemy.type === 'elite') { expValue = 10; color = '#ffcc00'; }

  state.expOrbs.push({
    id: orbIdCounter++,
    pos: { ...enemy.pos },
    value: expValue,
    radius: Math.min(10, 4 + expValue),
    color
  });

  state.enemies.splice(index, 1);
}
