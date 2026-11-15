import * as C from './config';
import { BiomePlan, blockOf, localOf, type BiomeId } from './biomes';
import { makeRng, type Rng } from './rng';

export type Phase = 'ready' | 'playing' | 'dying' | 'dead';

export interface Pair {
  index: number; // 0 = première paire ; donne le point n° index+1
  x: number;
  baseY: number;
  y: number; // centre actuel de l'ouverture (bouge dans le Marais)
  gap: number;
  moving: boolean;
  swing: number; // déphasage
  coin: { y: number; taken: boolean } | null;
  chili: { taken: boolean } | null;
  passed: boolean;
}

export type SimEvent =
  | { t: 'flap' }
  | { t: 'score'; score: number }
  | { t: 'coin' }
  | { t: 'biome'; id: BiomeId; score: number }
  | { t: 'bonus'; coins: number }
  | { t: 'shield' } // bouclier de glace obtenu
  | { t: 'ice' } // choc absorbé
  | { t: 'chili' }
  | { t: 'dashEnd' }
  | { t: 'gustWarn'; dir: 1 | -1 }
  | { t: 'gust'; dir: 1 | -1 }
  | { t: 'die' };

export interface Gust {
  dir: 1 | -1;
  warn: number; // temps restant d'avertissement
  left: number; // temps restant de rafale (après l'avertissement)
}

export class Sim {
  phase: Phase = 'ready';
  rng: Rng;
  plan: BiomePlan;
  time = 0; // temps de jeu (pas de partie en cours : sert aux animations)
  y = C.H * 0.45;
  prevY = C.H * 0.45;
  vy = 0;
  angle = 0;
  pairs: Pair[] = [];
  score = 0;
  coins = 0; // pièces ramassées pendant cette partie (bonus compris)
  scroll = 0; // distance parcourue, pour le décor
  speed = C.SPEED_START;
  shield = false;
  slide = 0; // temps restant de glissade
  slideFrom = 0;
  slideTo = 0;
  invincible = 0;
  dash = 0;
  chilis = 0; // piments pris dans ce biome
  gust: Gust | null = null;
  deathTime = 0;
  slowLeft = 0;
  events: SimEvent[] = [];
  /** Mode assisté : vitesse réduite et gravité douce (même progression). */
  assist = false;
  private pending = false;
  private nextIndex = 0;
  private lastGap = C.H / 2;
  private lastBiome: BiomeId = 'bamboo';

  constructor(seed: number) {
    this.rng = makeRng(seed);
    this.plan = new BiomePlan(seed);
    this.reset();
  }

  reset(): void {
    this.phase = 'ready';
    this.time = 0;
    this.y = this.prevY = C.H * 0.45;
    this.vy = 0;
    this.angle = 0;
    this.pairs = [];
    this.score = 0;
    this.coins = 0;
    this.scroll = 0;
    this.speed = C.SPEED_START;
    this.shield = false;
    this.slide = 0;
    this.invincible = 0;
    this.dash = 0;
    this.chilis = 0;
    this.gust = null;
    this.deathTime = 0;
    this.slowLeft = 0;
    this.events = [];
    this.pending = false;
    this.nextIndex = 0;
    this.lastGap = C.H / 2;
    this.lastBiome = 'bamboo';
    this.fill();
  }

  /** Le joueur appuie : mémorisé et appliqué au prochain pas (déterminisme). */
  flap(): void {
    if (this.phase === 'ready' || this.phase === 'playing') this.pending = true;
  }

  get biome(): BiomeId {
    return this.plan.idOf(this.score);
  }

  /** Rang du score courant dans son biome (0 = vient d'arriver). */
  get local(): number {
    return localOf(this.score);
  }

  /** Intensité des biomes spéciaux : x0,85 au 1er bloc, +0,05 par bloc, plafonnée à x1,15. */
  private specialRamp(): number {
    return C.SPECIAL_RAMP_START + C.SPECIAL_RAMP_STEP * Math.min(blockOf(this.score), C.SPECIAL_RAMP_BLOCKS);
  }

  private gapFor(index: number): number {
    const easy = Math.max(0, 1 - index / C.EASY_POINTS); // 1 au départ, 0 au 8e point
    return Math.max(C.GAP_MIN, C.GAP_START - C.GAP_PER_POINT * index) + Math.round(C.EASY_GAP_BONUS * easy);
  }

  private spawn(): void {
    const index = this.nextIndex++;
    const x = index === 0 ? C.FIRST_PAIR_X : this.pairs[this.pairs.length - 1]!.x + C.PAIR_SPACING;
    const chained = Math.min(C.CHAIN_MAX, Math.max(0, this.plan.chainOf(index) - 1));
    const gap = this.gapFor(index) + C.CHAIN_GAP_BONUS * chained;
    const lo = Math.max(C.GAP_CENTER_MIN, this.lastGap - C.GAP_CENTER_MAX_STEP);
    const hi = Math.min(C.GAP_CENTER_MAX, this.lastGap + C.GAP_CENTER_MAX_STEP);
    const baseY = index === 0 ? C.H * 0.45 : lo + this.rng() * (hi - lo);
    this.lastGap = baseY;
    const id = this.plan.idOf(index);
    const local = localOf(index);
    const moving = id === 'swamp' && local >= 1 && local % 2 === 1;
    const coin = index % 2 === 1 ? { y: baseY + (this.rng() * 2 - 1) * C.COIN_OFFSET, taken: false } : null;
    const chili = id === 'fire' && C.CHILI_LOCALS.includes(local) ? { taken: false } : null;
    this.pairs.push({
      index, x, baseY, y: baseY, gap, moving, swing: this.rng() * Math.PI * 2, coin, chili, passed: false,
    });
  }

  private fill(): void {
    while (this.pairs.length === 0 || this.pairs[this.pairs.length - 1]!.x < C.W + C.PAIR_SPACING) this.spawn();
  }

  /** Paire à viser : la première dont le bord droit n'est pas encore derrière le panda. */
  nextPair(): Pair | undefined {
    return this.pairs.find((p) => p.x + C.BAMBOO_W / 2 + C.PANDA_R > C.PANDA_X);
  }

  /** Vitesse de défilement courante. */
  currentSpeed(): number {
    const easy = Math.max(0, 1 - this.score / C.EASY_POINTS);
    const base = (Math.min(C.SPEED_MAX, C.SPEED_START + C.SPEED_PER_POINT * this.score) - C.EASY_SPEED_MALUS * easy) * (this.assist ? C.ASSIST_SPEED : 1);
    return this.dash > 0 ? base * C.DASH_SPEED : base;
  }

  private emit(e: SimEvent): void {
    this.events.push(e);
  }

  private swampActive(): boolean {
    return this.biome === 'swamp' && this.local >= 1;
  }

  private stormActive(): boolean {
    return this.biome === 'storm' && this.local >= 1;
  }

  /** Avance d'un pas fixe. Le temps réel passe par `advance`. */
  step(): void {
    const dt = C.STEP;
    if (this.phase === 'dead') return;
    this.time += dt;
    this.prevY = this.y;

    if (this.phase === 'ready') {
      // le panda flotte sur place
      this.y = C.H * 0.45 + Math.sin(this.time * 3.2) * 8;
      this.prevY = this.y;
      this.angle = Math.sin(this.time * 3.2 + 1) * 0.06;
      if (this.pending) {
        this.pending = false;
        this.phase = 'playing';
        this.applyFlap();
      }
      return;
    }

    if (this.phase === 'dying') {
      this.stepDying(dt);
      return;
    }

    // --- partie en cours ---
    if (this.pending) {
      this.pending = false;
      this.applyFlap();
    }
    this.speed = this.currentSpeed();
    const dx = this.speed * dt;
    this.scroll += dx;
    for (const p of this.pairs) {
      p.x -= dx;
      if (p.moving && this.swampActive()) {
        p.y = p.baseY + Math.sin((this.time * 2 * Math.PI) / C.SWAMP_MOVE_PERIOD + p.swing) * C.SWAMP_MOVE_AMP * this.specialRamp();
      }
    }

    this.stepGust(dt);

    if (this.invincible > 0) this.invincible = Math.max(0, this.invincible - dt);
    if (this.dash > 0) {
      this.dash -= dt;
      if (this.dash <= 0) {
        this.dash = 0;
        this.invincible = Math.max(this.invincible, C.DASH_AFTER);
        this.emit({ t: 'dashEnd' });
      }
    }

    if (this.slide > 0) {
      this.slide -= dt;
      const k = 1 - Math.max(0, this.slide) / C.ICE_SLIDE_TIME;
      const e = k * k * (3 - 2 * k);
      this.y = this.slideFrom + (this.slideTo - this.slideFrom) * e;
      this.vy = 0;
    } else if (this.dash > 0) {
      const target = this.nextPair();
      const ty = target ? target.y : this.y;
      this.y += (ty - this.y) * Math.min(1, C.DASH_STEER * dt);
      this.vy = 0;
    } else {
      const g = (this.swampActive() ? C.SWAMP_GRAVITY : C.GRAVITY) * (this.assist ? C.ASSIST_GRAVITY : 1);
      this.vy += g * dt;
      if (this.gust && this.gust.warn <= 0 && this.gust.left > 0) this.vy += this.gust.dir * C.GUST_FORCE * this.specialRamp() * dt;
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;
      this.y += this.vy * dt;
    }
    this.angle = Math.max(-0.35, Math.min(1.2, this.vy / 700));

    // pièces et piments
    for (const p of this.pairs) {
      if (p.coin && !p.coin.taken) {
        const d = Math.hypot(p.x - C.PANDA_X, p.coin.y - this.y);
        if (d < C.PANDA_R + C.COIN_REACH + C.COIN_R) {
          p.coin.taken = true;
          this.coins++;
          this.emit({ t: 'coin' });
        }
      }
      if (p.chili && !p.chili.taken) {
        const d = Math.hypot(p.x - C.PANDA_X, p.y - this.y);
        if (d < C.PANDA_R + C.CHILI_R + C.COIN_REACH) {
          p.chili.taken = true;
          this.chilis++;
          this.dash = this.dash > 0 ? this.dash + C.DASH_EXTEND : C.DASH_TIME;
          this.emit({ t: 'chili' });
        }
      }
    }

    // collisions
    if (this.y < -C.TOP_OUT) return this.die();
    const hit = this.hitsBamboo() || this.y + C.PANDA_R >= C.GROUND_Y;
    if (hit && this.invincible <= 0 && this.dash <= 0 && this.slide <= 0) {
      if (this.shield) {
        this.shield = false;
        this.invincible = C.ICE_INVINCIBLE;
        this.slide = C.ICE_SLIDE_TIME;
        this.slideFrom = this.y;
        const target = this.nextPair();
        this.slideTo = target ? target.y : C.H / 2;
        this.emit({ t: 'ice' });
      } else {
        return this.die();
      }
    }
    if (this.y + C.PANDA_R > C.GROUND_Y) {
      this.y = C.GROUND_Y - C.PANDA_R;
      if (this.vy > 0) this.vy = 0;
    }

    // points
    for (const p of this.pairs) {
      if (!p.passed && p.x + C.BAMBOO_W / 2 < C.PANDA_X - C.PANDA_R) {
        p.passed = true;
        this.addPoint();
      }
    }
    while (this.pairs.length && this.pairs[0]!.x < -C.BAMBOO_W) this.pairs.shift();
    this.fill();
  }

  private applyFlap(): void {
    // en mode assisté, l'impulsion suit la racine de la gravité : même hauteur de saut, vol plus long
    this.vy = (this.swampActive() ? C.SWAMP_FLAP_VY : C.FLAP_VY) * (this.assist ? Math.sqrt(C.ASSIST_GRAVITY) : 1);
    this.emit({ t: 'flap' });
  }

  private addPoint(): void {
    const before = this.score;
    this.score++;
    this.emit({ t: 'score', score: this.score });
    const id = this.plan.idOf(this.score);
    if (this.score % C.BIOME_BLOCK === 0) {
      // fin d'un biome : bonus s'il était spécial et survécu
      if (this.plan.idOf(before) !== 'bamboo') {
        const chained = Math.min(C.CHAIN_MAX, this.plan.chainOf(before) - 1);
        const bonus = C.COIN_BONUS_BIOME + C.CHAIN_COIN_BONUS * chained;
        this.coins += bonus;
        this.emit({ t: 'bonus', coins: bonus });
      }
      this.lastBiome = id;
      this.enterBiome(id);
    }
  }

  private enterBiome(id: BiomeId): void {
    this.emit({ t: 'biome', id, score: this.score });
    this.shield = id === 'ice';
    if (this.shield) this.emit({ t: 'shield' });
    if (id !== 'fire') this.chilis = 0;
    this.gust = null;
  }

  private stepGust(dt: number): void {
    if (!this.stormActive()) {
      this.gust = null;
      return;
    }
    const g = this.gust;
    if (g) {
      if (g.warn > 0) {
        g.warn -= dt;
        if (g.warn <= 0) this.emit({ t: 'gust', dir: g.dir });
      } else {
        g.left -= dt;
        if (g.left <= 0) this.gust = null;
      }
      return;
    }
    // une rafale toutes les 2 paires : on la déclenche au passage d'une paire de rang impair
    if (this.local % 2 === 1 && this.gustFor !== this.score) {
      this.gustFor = this.score;
      const dir: 1 | -1 = this.rng() < 0.5 ? -1 : 1;
      this.gust = { dir, warn: C.GUST_WARN, left: C.GUST_TIME };
      this.emit({ t: 'gustWarn', dir });
    }
  }
  private gustFor = -1;

  private hitsBamboo(): boolean {
    const r = C.PANDA_R;
    for (const p of this.pairs) {
      const left = p.x - C.BAMBOO_W / 2;
      const right = p.x + C.BAMBOO_W / 2;
      if (C.PANDA_X + r < left || C.PANDA_X - r > right) continue;
      if (circleRect(C.PANDA_X, this.y, r, left, -1000, right, p.y - p.gap / 2)) return true;
      if (circleRect(C.PANDA_X, this.y, r, left, p.y + p.gap / 2, right, C.GROUND_Y + 1000)) return true;
    }
    return false;
  }

  private die(): void {
    this.phase = 'dying';
    this.slowLeft = C.SLOWMO_TIME;
    this.deathTime = 0;
    this.vy = Math.min(this.vy, -200);
    this.emit({ t: 'die' });
  }

  private stepDying(dt: number): void {
    // ralenti 0,4 s (temps réel) : on avance moins vite dans la chute
    let k = 1;
    if (this.slowLeft > 0) {
      k = C.SLOWMO_SCALE;
      this.slowLeft -= dt;
    }
    this.deathTime += dt;
    this.vy = Math.min(C.MAX_FALL, this.vy + C.GRAVITY * dt * k);
    this.y += this.vy * dt * k;
    this.angle += 9 * dt * k;
    if (this.y + C.PANDA_R >= C.GROUND_Y) this.y = C.GROUND_Y - C.PANDA_R;
    if (this.y + C.PANDA_R >= C.GROUND_Y && this.slowLeft <= 0) this.phase = 'dead';
    if (this.deathTime >= C.DEATH_MAX) this.phase = 'dead';
  }

  /** Bonus de record (à appeler une fois à la fin, avec le record d'avant). Renvoie les pièces ajoutées. */
  recordBonus(prevBest: number): number {
    if (prevBest > 0 && this.score > prevBest) {
      this.coins += C.COIN_BONUS_RECORD;
      return C.COIN_BONUS_RECORD;
    }
    return 0;
  }
}

function circleRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number): boolean {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

/**
 * Pilote la simulation avec le temps réel : accumule `dtReal` (secondes) et fait des pas fixes.
 * Renvoie la fraction de pas restante (pour interpoler l'affichage).
 */
export class Clock {
  private acc = 0;
  constructor(private sim: Sim) {}
  advance(dtReal: number): number {
    this.acc += Math.min(dtReal, C.STEP * C.MAX_STEPS_PER_FRAME);
    while (this.acc >= C.STEP) {
      this.sim.step();
      this.acc -= C.STEP;
    }
    return this.acc / C.STEP;
  }
}

export { blockOf };
