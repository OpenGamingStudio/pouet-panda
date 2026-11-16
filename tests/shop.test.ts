import { describe, expect, it } from 'vitest';
import { DEFAULTS, ITEMS, SHELVES, itemsOf } from '../src/shop';

describe('catalogue boutique', () => {
  it('ids uniques, rayons connus, un défaut gratuit par rayon', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const sh of SHELVES) {
      expect(itemsOf(sh.id).length).toBeGreaterThan(1);
      expect(ITEMS.find((i) => i.id === DEFAULTS[sh.id])?.price).toBe(0);
    }
    for (const i of ITEMS) expect(i.id.startsWith(i.shelf + '.')).toBe(true);
  });
});
