import * as C from './config';
import { biomeOf, type BiomeInfo } from './biomes';
import type { Sim } from './sim';

export const INK = '#16110F';
export const CREAM = '#FFF4E0';
export const GUM = '#FF4F9A';

export interface View {
  w: number; // taille CSS du canevas
  h: number;
  dpr: number;
  scale: number;
  ox: number;
  oy: number;
}

export function makeView(w: number, h: number, dpr: number): View {
  const scale = Math.min(w / C.W, h / C.H);
  return { w, h, dpr, scale, ox: (w - C.W * scale) / 2, oy: h - C.H * scale };
}

export interface Look {
  fur: string;
  cloud: string;
  hat: string;
}

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
/** Mélange de deux couleurs plates (jamais un dégradé : un seul aplat par appel). */
export function mix(a: string, b: string, k: number): string {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const x = hex(a);
  const y = hex(b);
  const m = (i: number) => Math.round(x[i]! + (y[i]! - x[i]!) * k);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

export function blendBiome(a: BiomeInfo, b: BiomeInfo, k: number): BiomeInfo {
  return {
    ...b,
    sky: mix(a.sky, b.sky, k),
    bamboo: mix(a.bamboo, b.bamboo, k),
    far: mix(a.far, b.far, k),
    mid: mix(a.mid, b.mid, k),
    ground: mix(a.ground, b.ground, k),
    groundTop: mix(a.groundTop, b.groundTop, k),
  };
}

// ---------------------------------------------------------------- particules

interface Puff {
  x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; color: string; spark: boolean;
}

const RAINBOW = ['#FF4F4F', '#FF9F1A', '#FFD60A', '#6FCB3C', '#3FA9F5', '#B26BFF'];

export class Fx {
  puffs: Puff[] = [];
  private n = 0;

  /** Un nuage de pet sort derrière le panda. */
  fart(x: number, y: number, cloud: string, reduced: boolean): void {
    const count = reduced ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const spark = cloud === 'cloud.glitter' && i % 2 === 0;
      let color = CREAM;
      if (cloud === 'cloud.green') color = '#B7E26A';
      else if (cloud === 'cloud.bubbles') color = '#FF9EC8';
      else if (cloud === 'cloud.rainbow') color = RAINBOW[(this.n + i) % RAINBOW.length]!;
      else if (spark) color = '#FFD60A';
      this.puffs.push({
        x: x - 12 - i * 2, y: y + 12 + (i % 3) * 2, vx: -60 - i * 14, vy: 30 + i * 12 - (i % 2) * 40,
        r: spark ? 4 : 7 + (i % 3) * 2, life: 0, max: 0.55 + i * 0.05, color, spark,
      });
    }
    this.n++;
  }

  flame(x: number, y: number): void {
    this.puffs.push({
      x: x - 14, y: y + (this.n++ % 3) * 4 - 4, vx: -90, vy: -10, r: 6, life: 0, max: 0.35,
      color: this.n % 2 ? '#FF7A1A' : '#FFD60A', spark: false,
    });
  }

  update(dt: number): void {
    for (const p of this.puffs) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.puffs) {
      const k = 1 - p.life / p.max;
      const r = p.r * (0.6 + 0.6 * (1 - k)) * (p.spark ? k : 1);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      if (p.spark) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 6);
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

// ---------------------------------------------------------------- panda

interface FurStyle { body: string; patch: string; face: string; bands?: string[] }
const FURS: Record<string, FurStyle> = {
  'fur.classic': { body: '#FFFFFF', patch: INK, face: '#FFFFFF' },
  'fur.red': { body: '#E0652B', patch: '#7A2E12', face: CREAM },
  'fur.polar': { body: '#FFFFFF', patch: '#8FCBE6', face: '#FFFFFF' },
  'fur.gold': { body: '#FFD60A', patch: '#9A5B00', face: '#FFF1A0' },
  'fur.rainbow': { body: '#FFFFFF', patch: INK, face: '#FFFFFF', bands: RAINBOW },
};

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, line = 2.5): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.lineWidth = line;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

export function drawHat(ctx: CanvasRenderingContext2D, hat: string): void {
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  const rect = (x: number, y: number, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };
  if (hat === 'hat.beanie') {
    ell(ctx, 0, -22, 15, 10, GUM);
    rect(-16, -19, 32, 6, '#FFD60A');
    ell(ctx, 0, -32, 4, 4, CREAM);
  } else if (hat === 'hat.cap') {
    ell(ctx, 0, -21, 15, 9, '#3FA9F5');
    rect(2, -17, 22, 5, '#2680C2');
  } else if (hat === 'hat.crown') {
    ctx.beginPath();
    ctx.moveTo(-13, -17); ctx.lineTo(-14, -32); ctx.lineTo(-7, -25); ctx.lineTo(0, -34);
    ctx.lineTo(7, -25); ctx.lineTo(14, -32); ctx.lineTo(13, -17); ctx.closePath();
    ctx.fillStyle = '#FFD60A'; ctx.fill(); ctx.stroke();
    ell(ctx, 0, -22, 2.5, 2.5, '#D81E5B', 0, 1.5);
  } else if (hat === 'hat.chef') {
    rect(-11, -23, 22, 8, CREAM);
    ell(ctx, -8, -29, 7, 7, CREAM);
    ell(ctx, 8, -29, 7, 7, CREAM);
    ell(ctx, 0, -33, 8, 8, CREAM);
  } else if (hat === 'hat.bamboo') {
    rect(-3, -44, 6, 26, '#9BCB3C');
    ctx.beginPath(); ctx.moveTo(-3, -34); ctx.lineTo(3, -34); ctx.stroke();
    ell(ctx, 8, -40, 6, 3, '#6FA82C', -0.5, 1.8);
  }
}

/** Dessine le panda centré en (x, y), taille ≈ 44 px. */
export function drawPanda(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, look: Look, scale = 1): void {
  const f = FURS[look.fur] ?? FURS['fur.classic']!;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  // oreilles, jambes, corps, bras, tête
  ell(ctx, -14, -19, 7, 7, f.patch);
  ell(ctx, 14, -19, 7, 7, f.patch);
  ell(ctx, -10, 17, 6, 5, f.patch);
  ell(ctx, 10, 17, 6, 5, f.patch);
  ell(ctx, 0, 6, 17, 14, f.body);
  if (f.bands) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 6, 15.5, 12.5, 0, 0, Math.PI * 2); ctx.clip();
    f.bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-20, -7 + i * 4.6, 40, 4.7); });
    ctx.restore();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.ellipse(0, 6, 17, 14, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ell(ctx, -17, 5, 5, 8, f.patch, 0.3);
  ell(ctx, 17, 5, 5, 8, f.patch, -0.3);
  ell(ctx, 0, -5, 18, 16, f.face);
  ell(ctx, -8, -4, 5, 6.5, f.patch, 0.45, 0);
  ell(ctx, 8, -4, 5, 6.5, f.patch, -0.45, 0);
  ell(ctx, -7.5, -5, 2, 2.4, '#FFFFFF', 0, 0);
  ell(ctx, 8.5, -5, 2, 2.4, '#FFFFFF', 0, 0);
  ell(ctx, 0, 1, 3.2, 2.4, INK, 0, 0);
  ctx.lineWidth = 1.8; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.arc(0, 3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  drawHat(ctx, look.hat);
  ctx.restore();
}

// ---------------------------------------------------------------- objets

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const sx = 0.55 + 0.45 * Math.abs(Math.cos(t * 3));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.beginPath(); ctx.arc(0, 0, C.COIN_R, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD60A'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5); ctx.stroke();
  ctx.restore();
}

export function drawChili(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 4) * 3);
  ctx.rotate(-0.6);
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -10); ctx.lineTo(6, -9); ctx.quadraticCurveTo(10, 4, -3, 13); ctx.quadraticCurveTo(-8, 4, -4, -10);
  ctx.closePath();
  ctx.fillStyle = '#E8281E'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6FCB3C';
  ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(7, -10); ctx.lineTo(8, -15); ctx.lineTo(0, -13); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Motif d'un biome sur la tige : les biomes se reconnaissent par la forme, pas seulement par la couleur. */
function stalkPattern(ctx: CanvasRenderingContext2D, id: string, bx: number, bw: number, y0: number, y1: number, dark: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, y0, bw, y1 - y0);
  ctx.clip();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const a = Math.floor(y0 / 32) * 32;
  if (id === 'bamboo') {
    ctx.fillStyle = dark;
    for (let ny = Math.floor(y0 / 64) * 64 + 20; ny < y1; ny += 64) {
      if (ny < y0 + 6 || ny > y1 - 10) continue;
      ctx.fillRect(bx - 2, ny, bw + 4, 7);
      ctx.strokeRect(bx - 2, ny, bw + 4, 7);
    }
  } else if (id === 'ice') { // éclats en diagonale
    for (let y = a; y < y1 + 20; y += 32) { ctx.beginPath(); ctx.moveTo(bx + 6, y + 16); ctx.lineTo(bx + bw - 6, y); ctx.stroke(); }
  } else if (id === 'fire') { // braises : deux points décalés
    ctx.fillStyle = INK;
    for (let y = a, i = 0; y < y1 + 20; y += 24, i++) { ctx.beginPath(); ctx.arc(bx + (i % 2 ? bw * 0.7 : bw * 0.3), y + 10, 4, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'swamp') { // ondulation
    ctx.beginPath();
    for (let y = a, i = 0; y < y1 + 20; y += 12, i++) { const x = bx + bw / 2 + (i % 2 ? 9 : -9); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  } else if (id === 'storm') { // chevrons
    for (let y = a; y < y1 + 20; y += 30) { ctx.beginPath(); ctx.moveTo(bx + 7, y + 6); ctx.lineTo(bx + bw / 2, y + 18); ctx.lineTo(bx + bw - 7, y + 6); ctx.stroke(); }
  }
  ctx.restore();
}

function bambooPart(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, color: string, capAtBottom: boolean, biomeId: string, moving: boolean): void {
  const w = C.BAMBOO_W;
  const dark = mix(color, INK, 0.28);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  const bodyY0 = capAtBottom ? y0 + 16 : y0;
  const bodyY1 = capAtBottom ? y1 : y1 - 16;
  const bx = x - (w - 12) / 2;
  ctx.fillStyle = color;
  ctx.fillRect(bx, bodyY0, w - 12, bodyY1 - bodyY0);
  ctx.strokeRect(bx, bodyY0, w - 12, bodyY1 - bodyY0);
  stalkPattern(ctx, biomeId, bx, w - 12, bodyY0, bodyY1, dark);
  // bague au bord de l'ouverture
  const cy = capAtBottom ? y0 : y1 - 16;
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, cy, w, 16);
  ctx.strokeRect(x - w / 2, cy, w, 16);
  if (moving) { // ouverture mobile : double flèche sur la bague
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x - 7, cy + 7); ctx.lineTo(x, cy + 2); ctx.lineTo(x + 7, cy + 7);
    ctx.moveTo(x - 7, cy + 10); ctx.lineTo(x, cy + 15); ctx.lineTo(x + 7, cy + 10);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- décor

function motifs(ctx: CanvasRenderingContext2D, id: string, off: number, x0: number, x1: number, t: number, reduced: boolean): void {
  // petits éléments de biome, en aplats, sur le plan lointain (période 360)
  const start = Math.floor((x0 + off) / 90) - 1;
  const end = Math.ceil((x1 + off) / 90) + 1;
  for (let i = start; i <= end; i++) {
    const wx = i * 90 - off;
    const h = (i * 2654435761) >>> 0;
    const ry = (h % 1000) / 1000;
    if (id === 'bamboo') {
      if (h % 3 !== 0) continue;
      const y = 60 + ry * 200;
      ell(ctx, wx, y, 26, 9, '#FFFFFF', 0, 0);
      ell(ctx, wx + 14, y - 7, 14, 8, '#FFFFFF', 0, 0);
    } else if (id === 'ice') {
      const y = 40 + ry * 440;
      const dy = reduced ? 0 : (t * 18 + ry * 500) % 520;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx, (y + dy) % 520, 6, 6);
    } else if (id === 'fire') {
      if (h % 2 === 0) continue;
      const y = 520 - ((reduced ? 0 : t * 30) + ry * 480) % 480;
      ctx.fillStyle = '#FF7A1A';
      ctx.beginPath(); ctx.moveTo(wx, y - 6); ctx.lineTo(wx + 5, y); ctx.lineTo(wx, y + 6); ctx.lineTo(wx - 5, y); ctx.fill();
    } else if (id === 'swamp') {
      if (h % 2 === 0) continue;
      const y = 520 - ((reduced ? 0 : t * 22) + ry * 460) % 460;
      ell(ctx, wx, y, 7, 7, '#7FD6BC', 0, 2);
    } else if (id === 'storm') {
      if (h % 4 === 0) {
        ctx.fillStyle = '#FFD60A';
        const y = 60 + ry * 120;
        ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx + 14, y); ctx.lineTo(wx + 5, y + 26); ctx.lineTo(wx + 16, y + 26);
        ctx.lineTo(wx - 4, y + 64); ctx.lineTo(wx, y + 34); ctx.lineTo(wx - 9, y + 34); ctx.closePath(); ctx.fill();
      } else if (h % 4 === 1) {
        ell(ctx, wx, 70 + ry * 160, 34, 12, '#55539A', 0, 0);
        ell(ctx, wx + 18, 62 + ry * 160, 20, 11, '#55539A', 0, 0);
      }
    }
  }
}

function hills(ctx: CanvasRenderingContext2D, color: string, off: number, x0: number, x1: number, base: number, rad: number, period: number): void {
  ctx.fillStyle = color;
  const start = Math.floor((x0 + off) / period) - 1;
  const end = Math.ceil((x1 + off) / period) + 1;
  for (let i = start; i <= end; i++) {
    const wx = i * period - off + period / 2;
    const k = 0.7 + (((i * 40503) >>> 0) % 60) / 100;
    ctx.beginPath();
    ctx.ellipse(wx, base, rad * k * 1.5, rad * k, 0, Math.PI, 0);
    ctx.fill();
  }
}

function silhouettes(ctx: CanvasRenderingContext2D, color: string, off: number, x0: number, x1: number, base: number): void {
  const step = 46;
  const start = Math.floor((x0 + off) / step) - 1;
  const end = Math.ceil((x1 + off) / step) + 1;
  ctx.fillStyle = color;
  for (let i = start; i <= end; i++) {
    const wx = i * step - off;
    const h = 60 + (((i * 2246822519) >>> 0) % 90);
    ctx.fillRect(wx, base - h, 9, h);
    ctx.fillRect(wx - 2, base - h * 0.55, 13, 5);
  }
}

export interface Scene {
  sim: Sim;
  look: Look;
  biome: BiomeInfo; // déjà mélangé pendant le fondu
  biomeId: string;
  fx: Fx;
  alpha: number; // interpolation entre deux pas
  reduced: boolean;
  shake: number; // décalage en px logiques
  scrollIdle: number; // défilement du menu
  showPanda: boolean;
  pandaX?: number; // menu : panda au centre
  pandaScale?: number;
}

export function drawScene(ctx: CanvasRenderingContext2D, v: View, s: Scene): void {
  const sim = s.sim;
  const b = s.biome;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = b.sky;
  ctx.fillRect(0, 0, v.w * v.dpr, v.h * v.dpr);

  const k = v.scale * v.dpr;
  const shx = s.shake ? (Math.random() * 2 - 1) * s.shake : 0;
  const shy = s.shake ? (Math.random() * 2 - 1) * s.shake : 0;
  ctx.setTransform(k, 0, 0, k, (v.ox + shx) * v.dpr, (v.oy + shy) * v.dpr);
  const x0 = -v.ox / v.scale - 4;
  const x1 = (v.w - v.ox) / v.scale + 4;
  const scroll = sim.phase === 'ready' ? s.scrollIdle : sim.scroll;
  const par = s.reduced ? 0 : 1;

  motifs(ctx, s.biomeId, scroll * 0.2 * par, x0, x1, sim.time + s.scrollIdle * 0.01, s.reduced);
  hills(ctx, b.far, scroll * 0.2 * par, x0, x1, C.GROUND_Y - 40, 150, 300);
  silhouettes(ctx, b.mid, scroll * 0.5 * par, x0, x1, C.GROUND_Y);
  hills(ctx, mix(b.mid, b.ground, 0.4), scroll * 0.5 * par, x0, x1, C.GROUND_Y, 60, 170);

  // bambous : tracés dans le plateau seulement
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -2000, C.W, 4000);
  ctx.clip();
  const off = sim.phase === 'playing' ? sim.currentSpeed() * s.alpha * C.STEP : 0;
  if (sim.phase !== 'ready') {
    for (const p of sim.pairs) {
      const x = p.x - off;
      if (x < -C.BAMBOO_W || x > C.W + C.BAMBOO_W) continue;
      bambooPart(ctx, x, -20, p.y - p.gap / 2, b.bamboo, false, s.biomeId, p.moving);
      bambooPart(ctx, x, p.y + p.gap / 2, C.GROUND_Y, b.bamboo, true, s.biomeId, p.moving);
      if (p.coin && !p.coin.taken) drawCoin(ctx, x, p.coin.y, sim.time);
      if (p.chili && !p.chili.taken) drawChili(ctx, x, p.y, sim.time);
    }
  }
  ctx.restore();

  // sol (toute la largeur)
  ctx.fillStyle = b.ground;
  ctx.fillRect(x0, C.GROUND_Y, x1 - x0, C.H - C.GROUND_Y + 400);
  ctx.fillStyle = b.groundTop;
  ctx.fillRect(x0, C.GROUND_Y, x1 - x0, 10);
  ctx.fillStyle = INK;
  ctx.fillRect(x0, C.GROUND_Y - 1.5, x1 - x0, 3);
  ctx.fillStyle = mix(b.ground, INK, 0.25);
  const gs = scroll * par;
  for (let i = Math.floor((x0 + gs) / 40) - 1; i < (x1 + gs) / 40 + 1; i++) ctx.fillRect(i * 40 - gs, C.GROUND_Y + 22, 18, 6);

  // alerte de rafale
  const g = sim.gust;
  if (g && sim.phase === 'playing') {
    const warn = g.warn > 0;
    if (!warn || s.reduced || Math.floor(sim.time * 5) % 2 === 0) drawArrow(ctx, C.W - 38, C.H * 0.35, g.dir, warn);
    if (!warn && !s.reduced) {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 6; i++) ctx.fillRect(((i * 97 + sim.time * 420) % (C.W + 60)) - 30, 90 + i * 70, 34, 4);
    }
  }

  // panda
  if (s.showPanda) {
    s.fx.draw(ctx);
    const px = s.pandaX ?? C.PANDA_X;
    const py = sim.prevY + (sim.y - sim.prevY) * s.alpha;
    // pas plus de 3 clignotements par seconde ; avec les mouvements réduits : translucide, sans clignoter
    const inv = sim.invincible > 0 && sim.dash <= 0;
    const blink = inv && !s.reduced && Math.floor(sim.time * 5) % 2 === 0;
    ctx.globalAlpha = inv && s.reduced ? 0.55 : 1;
    if (!blink) {
      if (sim.shield && sim.phase !== 'dead') {
        ctx.beginPath(); ctx.arc(px, py, 29, 0, Math.PI * 2);
        ctx.lineWidth = 4; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.arc(px, py, 31, 0, Math.PI * 2); ctx.stroke();
      }
      drawPanda(ctx, px, py, sim.angle, s.look, s.pandaScale ?? 1);
      if (sim.dash > 0 && s.reduced) { // feu atténué : un anneau fixe au lieu des flammes
        ctx.globalAlpha = 1;
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 3; ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.arc(px, py, 27, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, warn: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  if (dir === -1) ctx.scale(1, -1);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.fillStyle = warn ? '#FFFFFF' : '#FFD60A';
  ctx.beginPath();
  ctx.moveTo(-16, -10); ctx.lineTo(-5, -10); ctx.lineTo(-5, -34); ctx.lineTo(5, -34); ctx.lineTo(5, -10);
  ctx.lineTo(16, -10); ctx.lineTo(0, 22); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

export { biomeOf };
