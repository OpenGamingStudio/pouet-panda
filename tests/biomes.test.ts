import { describe, expect, it } from 'vitest';
import { biomeIdOf, localOf } from '../src/biomes';

describe('biomes', () => {
  it('suit l\'ordre du GDD', () => {
    const at = (s: number) => biomeIdOf(s);
    expect([0, 7].map(at)).toEqual(['bamboo', 'bamboo']);
    expect([8, 15].map(at)).toEqual(['ice', 'ice']);
    expect(at(16)).toBe('bamboo');
    expect(at(24)).toBe('fire');
    expect(at(32)).toBe('bamboo');
    expect(at(40)).toBe('swamp');
    expect(at(56)).toBe('storm');
    expect(at(72)).toBe('ice');
    expect(at(88)).toBe('fire');
  });
  it('rang dans le biome', () => {
    expect(localOf(25)).toBe(1);
    expect(localOf(31)).toBe(7);
  });
});
