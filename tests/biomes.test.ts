import { describe, expect, it } from 'vitest';
import { biomeIdOf, localOf } from '../src/biomes';

describe('biomes', () => {
  it('suit l\'ordre du GDD', () => {
    const at = (s: number) => biomeIdOf(s);
    expect([0, 9].map(at)).toEqual(['bamboo', 'bamboo']);
    expect([10, 19].map(at)).toEqual(['ice', 'ice']);
    expect(at(20)).toBe('bamboo');
    expect(at(30)).toBe('fire');
    expect(at(40)).toBe('bamboo');
    expect(at(50)).toBe('swamp');
    expect(at(70)).toBe('storm');
    expect(at(90)).toBe('ice');
    expect(at(110)).toBe('fire');
  });
  it('rang dans le biome', () => {
    expect(localOf(31)).toBe(1);
    expect(localOf(37)).toBe(7);
  });
});
