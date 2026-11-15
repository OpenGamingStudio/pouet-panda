import { describe, expect, it } from 'vitest';
import { BiomePlan, localOf } from '../src/biomes';

describe('biomes', () => {
  it('les 8 premiers points sont en bambou', () => {
    const p = new BiomePlan(1);
    for (let s = 0; s < 8; s++) expect(p.idOf(s)).toBe('bamboo');
  });
  it('aléatoire, jamais deux fois le même biome de suite, tous vus', () => {
    const seen = new Set<string>();
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const p = new BiomePlan(seed);
      const ids: string[] = [];
      for (let b = 0; b < 60; b++) ids.push(p.idOf(b * 8));
      for (let b = 1; b < ids.length; b++) expect(ids[b]).not.toBe(ids[b - 1]);
      ids.forEach((i) => seen.add(i));
      orders.add(ids.slice(0, 6).join());
    }
    expect(seen.size).toBe(5);
    expect(orders.size).toBeGreaterThan(5);
  });
  it('même graine = même suite, quel que soit l\'ordre des questions', () => {
    const a = new BiomePlan(7);
    const b = new BiomePlan(7);
    const late = b.idOf(400);
    expect(a.idOf(400)).toBe(late);
    expect(a.idOf(40)).toBe(b.idOf(40));
  });
  it('rang dans le biome', () => {
    expect(localOf(25)).toBe(1);
    expect(localOf(31)).toBe(7);
  });
});
