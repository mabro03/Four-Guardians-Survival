import { GameState } from './types';
import { addEffect } from './effects';

export const WEAPON_DEFS: Record<string, {
  id: string; name: string; description: string;
  type: string; iconColor: string; rarity: 'base' | 'completed' | 'hidden';
}> = {
  '뇌명의 창': { id: '뇌명의 창', name: '뇌명의 창', description: '바라보는 방향으로 긴 창을 휘두름', type: 'weapon', iconColor: 'linear-gradient(135deg, #89f7fe, #66a6ff)', rarity: 'base' },
  '세계수의 나뭇가지': { id: '세계수의 나뭇가지', name: '세계수의 나뭇가지', description: '지나간 자리에 독 지대 생성', type: 'weapon', iconColor: 'linear-gradient(135deg, #0ba360, #3cba92)', rarity: 'base' },
  '공허한 화령의 그릇': { id: '공허한 화령의 그릇', name: '공허한 화령의 그릇', description: '주위를 도는 4개의 칼날 소환', type: 'weapon', iconColor: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', rarity: 'base' },
  '만파식적': { id: '만파식적', name: '만파식적', description: '주기적으로 적을 밀쳐내는 파동', type: 'weapon', iconColor: 'linear-gradient(135deg, #f6d365, #fda085)', rarity: 'base' },
  '청룡': { id: '청룡', name: '청룡', description: '무작위 번개 낙하, 적 기절 및 체인', type: 'completed', iconColor: 'linear-gradient(135deg, #00c6ff, #0072ff)', rarity: 'completed' },
  '현무': { id: '현무', name: '현무', description: '어둠의 소용돌이 생성, 적 기절', type: 'completed', iconColor: 'linear-gradient(135deg, #302b63, #8a2be2)', rarity: 'completed' },
  '주작': { id: '주작', name: '주작', description: '체력 최고 적에게 불타는 단검 발사', type: 'completed', iconColor: 'linear-gradient(135deg, #f12711, #f5af19)', rarity: 'completed' },
  '백호': { id: '백호', name: '백호', description: '강력한 돌풍, 이동속도 대폭 증가', type: 'completed', iconColor: 'linear-gradient(135deg, #c9d6ff, #e2e2e2)', rarity: 'completed' },
  '황룡': { id: '황룡', name: '황룡', description: '모든 사신수의 힘 각성 — 궁극의 해방', type: 'completed', iconColor: 'linear-gradient(135deg, #f6d365, #fda085, #f093fb, #f5576c)', rarity: 'hidden' },
};

const timers: Record<string, number> = {};
const orbitalAngle = { val: 0 };
let spearTimer = 0;
let worldTreeTimer = 0;
let worldTreeZones: { x: number; y: number; life: number }[] = [];
let slowTimer = 0;
let lightningTimer = 0;
let phoenixTimer = 0;
let windTimer = 0;
let huangLongFlashTimer = 0;

export function updateWeapons(state: GameState, dt: number) {
  const weapons = state.player.weapons;
  const buffs = state.player.buffs;
  const { player } = state;
  const isYellowDragon = weapons.includes('황룡');
  const mult = isYellowDragon ? 2 : 1;

  // ─── 뇌명의 창 / 청룡 ───────────────────────────────────────
  const hasSpear = weapons.includes('뇌명의 창') || isYellowDragon;
  const hasAzureDragon = weapons.includes('청룡') || isYellowDragon;

  if (hasSpear && !hasAzureDragon) {
    spearTimer += dt;
    if (spearTimer >= 0.8) {
      spearTimer = 0;
      fireSpear(state, mult);
    }
  }

  if (hasAzureDragon) {
    lightningTimer += dt;
    if (lightningTimer >= 0.5) {
      lightningTimer = 0;
      if (state.enemies.length > 0) {
        const numStrikes = 1 + (isYellowDragon ? 2 : 0);
        for (let s = 0; s < numStrikes; s++) {
          const target = state.enemies[Math.floor(Math.random() * state.enemies.length)];
          const dmg = 50 * mult;
          target.hp -= dmg;
          target.stunTimer = 0.3;
          addEffect(state, { pos: { ...target.pos }, type: 'lightning', color: '#4af', life: 0.4, maxLife: 0.4, size: 3 });
          addEffect(state, { pos: { ...target.pos }, type: 'damage_text', color: '#4af', life: 0.6, maxLife: 0.6, size: 16, text: dmg.toString() });
          // Chain
          const chain = state.enemies.filter(e => e !== target).sort((a, b) => {
            const da = Math.hypot(a.pos.x - target.pos.x, a.pos.y - target.pos.y);
            const db = Math.hypot(b.pos.x - target.pos.x, b.pos.y - target.pos.y);
            return da - db;
          }).slice(0, 2);
          for (const ce of chain) {
            ce.hp -= dmg * 0.5;
            ce.stunTimer = 0.15;
            addEffect(state, { pos: { ...ce.pos }, type: 'lightning', color: '#4af', life: 0.25, maxLife: 0.25, size: 2 });
          }
        }
      }
    }
  }

  // ─── 세계수의 나뭇가지 / 현무 ──────────────────────────────
  const hasBranch = weapons.includes('세계수의 나뭇가지') || isYellowDragon;
  const hasBlackTortoise = weapons.includes('현무') || isYellowDragon;

  if (hasBranch || hasBlackTortoise) {
    worldTreeTimer += dt;
    if (worldTreeTimer >= 0.5) {
      worldTreeTimer = 0;
      worldTreeZones.push({ x: player.pos.x, y: player.pos.y, life: hasBlackTortoise ? 3.5 : 2 });
    }

    for (let i = worldTreeZones.length - 1; i >= 0; i--) {
      worldTreeZones[i].life -= dt;
      if (worldTreeZones[i].life <= 0) {
        worldTreeZones.splice(i, 1);
        continue;
      }
      const zone = worldTreeZones[i];
      const radius = hasBlackTortoise ? 60 : 50;
      addEffect(state, {
        pos: { x: zone.x, y: zone.y },
        type: 'zone',
        color: hasBlackTortoise ? '#8a2be2' : '#0ba360',
        life: 0.1, maxLife: 0.1,
        size: radius
      });
      for (const e of state.enemies) {
        const dist = Math.hypot(e.pos.x - zone.x, e.pos.y - zone.y);
        if (dist < radius) {
          if (hasBlackTortoise) {
            e.stunTimer = Math.max(e.stunTimer, 0.2);
          }
          e.hp -= 5 * mult * dt * 2;
          if (buffs.includes('영원의 불꽃') || isYellowDragon) e.burnStacks += 1;
        }
      }
    }
  }

  // ─── 공허한 화령의 그릇 / 주작 ──────────────────────────────
  const hasVessel = weapons.includes('공허한 화령의 그릇') || isYellowDragon;
  const hasVermillion = weapons.includes('주작') || isYellowDragon;

  if (hasVessel && !hasVermillion) {
    orbitalAngle.val += dt * 2;
    const r = 70;
    for (let i = 0; i < 4; i++) {
      const angle = orbitalAngle.val + (i * Math.PI) / 2;
      const bx = player.pos.x + Math.cos(angle) * r;
      const by = player.pos.y + Math.sin(angle) * r;
      addEffect(state, { pos: { x: bx, y: by }, type: 'orbital_blade', color: '#a18cd1', life: 0.05, maxLife: 0.05, size: 12 });
      for (const e of state.enemies) {
        const dist = Math.hypot(e.pos.x - bx, e.pos.y - by);
        if (dist < 20) {
          e.hp -= 25 * mult * dt * 4;
          if (buffs.includes('영원의 불꽃')) e.burnStacks += 1;
        }
      }
    }
  }

  if (hasVermillion) {
    phoenixTimer += dt;
    if (phoenixTimer >= 0.6) {
      phoenixTimer = 0;
      const highest = state.enemies.sort((a, b) => b.hp - a.hp)[0];
      if (highest) {
        const numDaggers = 4;
        for (let d = 0; d < numDaggers; d++) {
          const offsetAngle = (d / numDaggers) * Math.PI * 2;
          const ox = player.pos.x + Math.cos(offsetAngle) * 30;
          const oy = player.pos.y + Math.sin(offsetAngle) * 30;
          const dx = highest.pos.x - ox;
          const dy = highest.pos.y - oy;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            state.projectiles.push({
              id: Math.random(),
              pos: { x: ox, y: oy },
              dir: { x: dx / dist, y: dy / dist },
              speed: 350,
              radius: 7,
              damage: 40 * mult,
              life: 1.5,
              maxLife: 1.5,
              type: 'phoenix_dagger',
              color: '#f12711',
              pierce: 0,
              hitEnemies: new Set()
            });
          }
        }
      }
    }
  }

  // ─── 만파식적 / 백호 ─────────────────────────────────────────
  const hasFlute = weapons.includes('만파식적') || isYellowDragon;
  const hasWhiteTiger = weapons.includes('백호') || isYellowDragon;

  if (hasFlute || hasWhiteTiger) {
    windTimer += dt;
    const cooldown = hasWhiteTiger ? 3 : 4;
    if (windTimer >= cooldown) {
      windTimer = 0;
      const pushRadius = hasWhiteTiger ? 220 : 150;
      const pushForce = hasWhiteTiger ? 500 : 300;
      addEffect(state, { pos: { ...player.pos }, type: 'wind_ring', color: hasWhiteTiger ? '#c9d6ff' : '#f6d365', life: 0.5, maxLife: 0.5, size: pushRadius });

      const hit: { e: typeof state.enemies[0]; nx: number; ny: number }[] = [];
      for (const e of state.enemies) {
        const dx = e.pos.x - player.pos.x;
        const dy = e.pos.y - player.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pushRadius && dist > 0) {
          e.hp -= 20 * mult;
          e.knockback.x += (dx / dist) * pushForce * mult;
          e.knockback.y += (dy / dist) * pushForce * mult;
          hit.push({ e, nx: dx / dist, ny: dy / dist });
        }
      }

      if (hasWhiteTiger && hit.length > 1) {
        for (let i = 0; i < hit.length; i++) {
          for (let j = i + 1; j < hit.length; j++) {
            const dist = Math.hypot(hit[i].e.pos.x - hit[j].e.pos.x, hit[i].e.pos.y - hit[j].e.pos.y);
            if (dist < (hit[i].e.radius + hit[j].e.radius) * 3) {
              const collDmg = 30 * mult;
              hit[i].e.hp -= collDmg;
              hit[j].e.hp -= collDmg;
              addEffect(state, { pos: { x: (hit[i].e.pos.x + hit[j].e.pos.x) / 2, y: (hit[i].e.pos.y + hit[j].e.pos.y) / 2 }, type: 'damage_text', color: '#c9d6ff', life: 0.6, maxLife: 0.6, size: 16, text: collDmg.toString() });
            }
          }
        }
      }
    }
  }

  // ─── Pulsating Rock buff slow ─────────────────────────────
  if (buffs.includes('맥동하는 암석') || isYellowDragon) {
    slowTimer += dt;
    if (slowTimer >= 3) {
      slowTimer = 0;
      for (const e of state.enemies) {
        const dist = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
        if (dist < 250) e.slowTimer = 1.5;
      }
      addEffect(state, { pos: { ...player.pos }, type: 'wind_ring', color: '#555', life: 0.4, maxLife: 0.4, size: 250 });
    }
  }

  // ─── 황룡 periodic gold flash ─────────────────────────────
  if (isYellowDragon) {
    huangLongFlashTimer += dt;
    if (huangLongFlashTimer >= 5) {
      huangLongFlashTimer = 0;
      for (const e of state.enemies) {
        const dist = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
        if (dist < 300) {
          e.hp -= 120;
          addEffect(state, { pos: { ...e.pos }, type: 'damage_text', color: '#ffd700', life: 0.7, maxLife: 0.7, size: 18, text: '120' });
        }
      }
      addEffect(state, { pos: { ...player.pos }, type: 'gold_flash', color: '#ffd700', life: 0.6, maxLife: 0.6, size: 300 });
    }
  }

  // ─── Update Projectiles ───────────────────────────────────
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt;
    if (p.life <= 0) { state.projectiles.splice(i, 1); continue; }

    p.pos.x += p.dir.x * p.speed * dt;
    p.pos.y += p.dir.y * p.speed * dt;

    for (const e of state.enemies) {
      if (p.hitEnemies.has(e.id)) continue;
      const dist = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
      if (dist < p.radius + e.radius) {
        e.hp -= p.damage;
        p.hitEnemies.add(e.id);
        addEffect(state, { pos: { ...e.pos }, type: 'damage_text', color: p.color, life: 0.5, maxLife: 0.5, size: 14, text: Math.floor(p.damage).toString() });
        if (buffs.includes('영원의 불꽃') || weapons.includes('주작') || isYellowDragon) e.burnStacks += 3;
        if (buffs.includes('하늘의 파편') || isYellowDragon) {
          if (Math.random() < 0.2) {
            const chainTarget = state.enemies.filter(ce => ce !== e).sort((a, b) =>
              Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) - Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y)
            )[0];
            if (chainTarget) {
              chainTarget.hp -= p.damage * 0.5;
              addEffect(state, { pos: { ...chainTarget.pos }, type: 'lightning', color: '#4af', life: 0.2, maxLife: 0.2, size: 2 });
            }
          }
        }
        if (p.pierce <= 0) { p.life = 0; break; } else { p.pierce--; }
      }
    }
  }
}

function fireSpear(state: GameState, mult: number) {
  const { player } = state;
  const dir = player.dir;
  const perpAngle = Math.atan2(dir.y, dir.x);
  for (let spread = -1; spread <= 1; spread++) {
    const angle = perpAngle + spread * 0.3;
    state.projectiles.push({
      id: Math.random(),
      pos: { x: player.pos.x, y: player.pos.y },
      dir: { x: Math.cos(angle), y: Math.sin(angle) },
      speed: 500,
      radius: 8,
      damage: 35 * mult,
      life: 0.5,
      maxLife: 0.5,
      type: 'spear',
      color: '#89f7fe',
      pierce: 3,
      hitEnemies: new Set()
    });
  }
  addEffect(state, { pos: { ...player.pos }, type: 'spear_arc', color: '#89f7fe', life: 0.2, maxLife: 0.2, size: 80, angle: perpAngle });
}
