import { GameState, VisualEffect } from './types';

let effectIdCounter = 0;

export function addEffect(state: GameState, effect: Omit<VisualEffect, 'id'>) {
  state.effects.push({ ...effect, id: effectIdCounter++ });
}

export function updateEffects(state: GameState, dt: number) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) {
      state.effects.splice(i, 1);
    }
  }
}

export function drawEffects(state: GameState, ctx: CanvasRenderingContext2D) {
  for (const eff of state.effects) {
    const t = Math.max(0, eff.life / eff.maxLife);
    ctx.save();
    ctx.globalAlpha = t;

    if (eff.type === 'damage_text') {
      ctx.fillStyle = eff.color;
      ctx.font = `bold ${eff.size}px sans-serif`;
      ctx.textAlign = 'center';
      const rise = (1 - t) * 60;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 8;
      ctx.fillText(eff.text || '', eff.pos.x, eff.pos.y - rise);

    } else if (eff.type === 'circle') {
      const radius = eff.size * (1 + (1 - t) * 2);
      const grad = ctx.createRadialGradient(eff.pos.x, eff.pos.y, 0, eff.pos.x, eff.pos.y, radius);
      grad.addColorStop(0, eff.color + 'cc');
      grad.addColorStop(1, eff.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

    } else if (eff.type === 'zone') {
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, eff.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = eff.color + '22';
      ctx.fill();

    } else if (eff.type === 'lightning') {
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = eff.size;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 20;
      const x = eff.pos.x;
      const y = eff.pos.y;
      ctx.beginPath();
      ctx.moveTo(x + (Math.random() - 0.5) * 20, y - 600);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y - 400);
      ctx.lineTo(x + (Math.random() - 0.5) * 30, y - 200);
      ctx.lineTo(x + (Math.random() - 0.5) * 20, y - 100);
      ctx.lineTo(x, y);
      ctx.stroke();

    } else if (eff.type === 'spear_arc') {
      const angle = eff.angle ?? 0;
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, eff.size * (1 + (1 - t) * 0.5), angle - 0.5, angle + 0.5);
      ctx.stroke();

    } else if (eff.type === 'orbital_blade') {
      ctx.fillStyle = eff.color;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, eff.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4';
      ctx.beginPath();
      ctx.arc(eff.pos.x - 3, eff.pos.y - 3, eff.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (eff.type === 'wind_ring') {
      const radius = eff.size * (1 + (1 - t) * 0.4);
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = 3 * t;
      ctx.shadowColor = eff.color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = t * 0.8;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = eff.color + '88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, radius * 0.8, 0, Math.PI * 2);
      ctx.stroke();

    } else if (eff.type === 'gold_flash') {
      const grad = ctx.createRadialGradient(eff.pos.x, eff.pos.y, 0, eff.pos.x, eff.pos.y, eff.size);
      grad.addColorStop(0, '#ffd70088');
      grad.addColorStop(0.5, '#ffd70044');
      grad.addColorStop(1, '#ffd70000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(eff.pos.x, eff.pos.y, eff.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
