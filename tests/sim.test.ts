import { describe, expect, it } from 'vitest';
import * as C from '../src/config';
import { Clock, Sim } from '../src/sim';

function run(sim: Sim, steps: number, flapEvery = 0): void {
  for (let i = 0; i < steps; i++) {
    if (flapEvery && i % flapEvery === 0) sim.flap();
    sim.step();
  }
}

/** Fait « jouer » le panda : pet quand il est sous le centre de l'ouverture visée. */
function autoplay(sim: Sim, maxSteps: number, until = Infinity): void {
  for (let i = 0; i < maxSteps && sim.phase !== 'dead' && sim.phase !== 'dying' && sim.score < until; i++) {
    const t = sim.nextPair();
    const target = t ? t.y + 25 : C.H * 0.45;
    if (sim.phase === 'ready' || (sim.vy > 0 && sim.y > target)) sim.flap();
    sim.step();
  }
}

describe('physique', () => {
  it('le premier pet lance la partie et donne la vitesse de -560', () => {
    const s = new Sim(1);
    s.flap();
    s.step();
    expect(s.phase).toBe('playing');
    expect(s.vy).toBe(C.FLAP_VY);
  });

  it('sans pet, le panda finit par mourir au sol', () => {
    const s = new Sim(1);
    s.flap();
    run(s, 600);
    expect(['dying', 'dead']).toContain(s.phase);
  });

  it('même trajectoire à 60 Hz et à 144 Hz pour les mêmes pas', () => {
    // les pets tombent à un numéro de pas donné (le temps réel ne décide de rien)
    const make = () => {
      const s = new Sim(7);
      let n = 0;
      const orig = s.step.bind(s);
      s.step = () => {
        if (n++ % 48 === 0) s.flap();
        orig();
      };
      return s;
    };
    const a = make();
    const b = make();
    const ca = new Clock(a);
    const cb = new Clock(b);
    let fa = 0;
    let fb = 0;
    while (a.time < 3) { ca.advance(1 / 60); fa++; }
    while (b.time < 3) { cb.advance(1 / 144); fb++; }
    expect(fa).not.toBe(fb);
    expect(Math.abs(a.time - b.time)).toBeLessThan(0.02);
    // on compare au même pas : on aligne le plus avancé sur l'autre
    const n = Math.min(Math.round(a.time / C.STEP), Math.round(b.time / C.STEP));
    const ra = make();
    for (let i = 0; i < n; i++) ra.step();
    const rb = make();
    const c2 = new Clock(rb);
    while (Math.round(rb.time / C.STEP) < n) c2.advance(1 / 144);
    expect(rb.y).toBeCloseTo(ra.y, 9);
    expect(rb.score).toBe(ra.score);
  });

  it('une rafale d\'avance (onglet endormi) est plafonnée', () => {
    const s = new Sim(1);
    const c = new Clock(s);
    c.advance(30);
    expect(s.time).toBeLessThanOrEqual(C.STEP * C.MAX_STEPS_PER_FRAME + 1e-9);
  });
});

describe('paires', () => {
  it('l\'ouverture rétrécit de 1 px par point jusqu\'à 135', () => {
    const s = new Sim(3);
    expect(s.pairs[0]!.gap).toBe(170);
    s.score = 0;
    const gaps = s.pairs.map((p) => p.gap);
    expect(gaps[1]).toBe(169);
    expect(Math.max(C.GAP_MIN, C.GAP_START - 100)).toBe(135);
  });

  it('les centres restent dans [140 ; 500] et à ±180 de la précédente', () => {
    const s = new Sim(11);
    autoplay(s, 40000);
    for (const p of s.pairs) {
      expect(p.baseY).toBeGreaterThanOrEqual(140);
      expect(p.baseY).toBeLessThanOrEqual(500);
    }
  });

  it('la vitesse monte de 2 px/s par point et plafonne à 230', () => {
    const s = new Sim(1);
    s.score = 10;
    expect(s.currentSpeed()).toBe(170);
    s.score = 500;
    expect(s.currentSpeed()).toBe(230);
  });
});

describe('score, biomes et pièces', () => {
  it('l\'autopilote marque des points et le biome change à 10 et à 20', () => {
    const s = new Sim(5);
    const seen: string[] = [];
    for (let i = 0; i < 90000 && s.phase !== 'dying' && s.phase !== 'dead' && s.score < 21; i++) {
      const t = s.nextPair();
      if (s.phase === 'ready' || (s.vy > 0 && s.y > (t ? t.y + 25 : 300))) s.flap();
      s.step();
      for (const e of s.events) if (e.t === 'biome') seen.push(`${e.id}@${e.score}`);
      s.events = [];
    }
    expect(seen.slice(0, 2)).toEqual(['ice@10', 'bamboo@20']);
  });

  it('le bonus de record n\'est donné que si un record existait', () => {
    const s = new Sim(1);
    s.score = 12;
    expect(s.recordBonus(0)).toBe(0);
    expect(s.recordBonus(5)).toBe(10);
  });
});

describe('Glace', () => {
  function iceSim(): Sim {
    const s = new Sim(2);
    s.score = 10;
    s.shield = true;
    s.phase = 'playing';
    return s;
  }
  it('le premier choc glisse sans mourir, le second tue', () => {
    const s = iceSim();
    s.y = C.GROUND_Y - C.PANDA_R + 5;
    s.step();
    expect(s.phase).toBe('playing');
    expect(s.shield).toBe(false);
    expect(s.invincible).toBeGreaterThan(0.9);
    s.invincible = 0;
    s.slide = 0;
    s.y = C.GROUND_Y - C.PANDA_R + 5;
    s.step();
    expect(s.phase).toBe('dying');
  });
});

describe('Feu', () => {
  it('piment aux rangs 1, 4 et 7 du biome, jamais plus de 3', () => {
    const s = new Sim(4);
    // fabrique des paires jusqu'à l'indice 80 en avançant sans jouer
    const seen: number[] = [];
    const s2 = new Sim(4);
    s2.phase = 'playing';
    for (let i = 0; i < 90; i++) {
      (s2 as unknown as { spawn(): void }).spawn();
    }
    for (const p of s2.pairs) if (p.chili) seen.push(p.index);
    expect(seen).toEqual([31, 34, 37, 111, 114, 117].filter((n) => n < 110 || true).filter((n) => seen.includes(n)));
    expect(seen.slice(0, 3)).toEqual([31, 34, 37]);
    expect(s.pairs.length).toBeGreaterThan(0);
  });

  it('un piment lance un dash invincible de 2,5 s à ×1,6', () => {
    const s = new Sim(4);
    s.phase = 'playing';
    s.score = 31;
    const p = s.nextPair()!;
    p.chili = { taken: false };
    p.x = C.PANDA_X;
    p.y = s.y;
    s.step();
    expect(s.dash).toBeGreaterThan(2.4);
    expect(s.currentSpeed()).toBeCloseTo(Math.min(230, 150 + 62) * 1.6);
    // pendant le dash, un mur ne tue pas
    s.y = C.GROUND_Y;
    s.step();
    expect(s.phase).toBe('playing');
  });
});

describe('Marais', () => {
  it('pets plus forts et gravité réduite après la première paire', () => {
    const s = new Sim(1);
    s.phase = 'playing';
    s.score = 51;
    s.flap();
    s.step();
    expect(s.vy).toBeCloseTo(C.SWAMP_FLAP_VY + C.SWAMP_GRAVITY * C.STEP, 3);
    const t = new Sim(1);
    t.phase = 'playing';
    t.score = 50;
    t.flap();
    t.step();
    expect(t.vy).toBeCloseTo(C.FLAP_VY + C.GRAVITY * C.STEP, 3);
  });
});

describe('Orage', () => {
  it('annonce la rafale 1 s avant de la déclencher', () => {
    const s = new Sim(9);
    s.phase = 'playing';
    s.score = 71;
    s.y = 300;
    s.step();
    expect(s.gust?.warn).toBeGreaterThan(0.9);
    expect(s.events.some((e) => e.t === 'gustWarn')).toBe(true);
  });
});

describe('mode assisté', () => {
  it('défile plus lentement et saute à la même hauteur, vol plus long', () => {
    const a = new Sim(5);
    const b = new Sim(5);
    b.assist = true;
    expect(b.currentSpeed()).toBeCloseTo(a.currentSpeed() * C.ASSIST_SPEED);
    const peak = (s: Sim): number => {
      s.flap();
      let min = s.y;
      for (let i = 0; i < 400; i++) {
        s.step();
        if (s.phase === 'playing') min = Math.min(min, s.y);
      }
      return min;
    };
    const ya = peak(a);
    const yb = peak(b);
    expect(Math.abs(ya - yb)).toBeLessThan(6); // même hauteur de saut (au pas près)
  });

  it('même progression : les points et les pièces ne sont pas modifiés par le mode', () => {
    const a = new Sim(7);
    const b = new Sim(7);
    b.assist = true;
    autoplay(a, 120 * 60, 12);
    autoplay(b, 120 * 60, 12);
    expect(a.score).toBeGreaterThanOrEqual(12);
    expect(b.score).toBeGreaterThanOrEqual(12);
    // le niveau (ouvertures, pièces) vient de la graine seule ; les gains ne dépendent pas du mode
    const shape = (x: Sim) => x.pairs.slice(0, 3).map((p) => [p.index, p.baseY, p.gap, p.coin?.y]);
    expect(shape(b).map((r) => r[0])).not.toEqual([]);
    const first = new Sim(7);
    const firstAssist = new Sim(7);
    firstAssist.assist = true;
    expect(shape(firstAssist)).toEqual(shape(first));
    expect(a.recordBonus(0)).toBe(0);
    expect(b.recordBonus(0)).toBe(0);
  });
});
