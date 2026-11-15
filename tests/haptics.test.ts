import { describe, expect, it, vi } from 'vitest';
import { buzz, canVibrate, PATTERNS } from '../src/haptics';

describe('retour haptique', () => {
  it('vibre sur un choc de glace et sur la perte de vie', () => {
    const vibrate = vi.fn(() => true);
    expect(buzz('shield', true, false, { vibrate })).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.shield);
    expect(buzz('die', true, false, { vibrate })).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.die);
  });
  it('ne vibre pas si le réglage est coupé ou si les mouvements sont réduits', () => {
    const vibrate = vi.fn(() => true);
    expect(buzz('die', false, false, { vibrate })).toBe(false);
    expect(buzz('die', true, true, { vibrate })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it('ne plante pas sans navigator.vibrate (iOS, ordinateur) ni si vibrate lève', () => {
    expect(canVibrate({})).toBe(false);
    expect(buzz('die', true, false, {})).toBe(false);
    expect(buzz('die', true, false, { vibrate: () => { throw new Error('refusé'); } })).toBe(false);
  });
});
