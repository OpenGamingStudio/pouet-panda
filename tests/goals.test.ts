import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { CHALLENGES, challengeFor, dayKey, evaluate, rollDaily } from '../src/goals';
import { freshSave, load, write, type Store } from '../src/save';

const store = (init: Record<string, string> = {}): Store & { m: Record<string, string> } => {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => void (m[k] = v) };
};

describe('défis et succès', () => {
  it('le défi du jour est stable pour une date et existe', () => {
    expect(challengeFor('2026-11-15').id).toBe(challengeFor('2026-11-15').id);
    expect(CHALLENGES.map((c) => c.id)).toContain(challengeFor('2026-11-16').id);
  });

  it('dayKey est en heure locale, sur 2 chiffres', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('un nouveau jour remet le défi à faire', () => {
    const d = freshSave();
    expect(rollDaily(d, '2026-11-15')).toBe(true);
    d.daily.done = true;
    expect(rollDaily(d, '2026-11-15')).toBe(false);
    expect(d.daily.done).toBe(true);
    rollDaily(d, '2026-11-16');
    expect(d.daily.done).toBe(false);
  });

  it('défis Glace et Orage : validés en entrant dans le biome', () => {
    const run = (b: string[]) => ({ score: 1, coins: 0, biomes: b as never });
    expect(CHALLENGES.find((c) => c.id === 'storm')?.test(run(['bamboo', 'storm']))).toBe(true);
    expect(CHALLENGES.find((c) => c.id === 'storm')?.test(run(['bamboo']))).toBe(false);
    expect(CHALLENGES.find((c) => c.id === 'ice')?.desc).toMatch(/^Entre dans/);
  });

  it('succès obtenus une seule fois', () => {
    const d = freshSave();
    d.games = 1;
    const r1 = evaluate(d, { score: 12, coins: 3, biomes: ['bamboo'] }, '2026-11-15');
    expect(r1.newAchievements.map((a) => a.id)).toEqual(['first', 'score10']);
    const r2 = evaluate(d, { score: 12, coins: 3, biomes: ['bamboo'] }, '2026-11-15');
    expect(r2.newAchievements).toEqual([]);
  });

  it('défi du jour validé une seule fois', () => {
    const d = freshSave();
    d.daily = { day: '2026-11-15', id: 'score15', done: false };
    expect(evaluate(d, { score: 20, coins: 0, biomes: [] }, '2026-11-15').dailyJustDone?.id).toBe('score15');
    expect(evaluate(d, { score: 20, coins: 0, biomes: [] }, '2026-11-15').dailyJustDone).toBeNull();
  });

  it('défi de biome', () => {
    const d = freshSave();
    d.daily = { day: '2026-11-15', id: 'ice', done: false };
    expect(evaluate(d, { score: 1, coins: 0, biomes: ['bamboo'] }, '2026-11-15').dailyJustDone).toBeNull();
    expect(evaluate(d, { score: 1, coins: 0, biomes: ['bamboo', 'ice'] }, '2026-11-15').dailyJustDone?.id).toBe('ice');
  });

  it('sauvegarde : aller-retour, ids inconnus et date folle rejetés, ancienne sauvegarde acceptée', () => {
    const st = store();
    const l = load(st);
    l.data.achievements = ['first'];
    l.data.daily = { day: '2026-11-15', id: 'coins8', done: true };
    write(st, l);
    const back = load(st).data;
    expect(back.achievements).toEqual(['first']);
    expect(back.daily).toEqual({ day: '2026-11-15', id: 'coins8', done: true });
    const bad = load(store({ [SAVE_KEY]: JSON.stringify({ v: 1, best: 5, achievements: ['x', 3, 'first', 'first'], daily: { day: '<b>', id: 'zzz', done: true } }) })).data;
    expect(bad.achievements).toEqual(['first']);
    expect(bad.daily).toEqual(freshSave().daily);
    expect(bad.best).toBe(5);
  });
});
