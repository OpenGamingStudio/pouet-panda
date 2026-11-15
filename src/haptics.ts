/** Retour haptique optionnel (navigator.vibrate) : choc absorbé par la glace et perte de vie. */
export type Buzz = 'shield' | 'die';

export const PATTERNS: Record<Buzz, number[]> = {
  shield: [25],
  die: [40, 30, 90],
};

interface VibrateNav {
  vibrate?: (p: number[]) => boolean;
}

/** Vibration disponible (absente sur iOS Safari et sur ordinateur). */
export function canVibrate(nav: VibrateNav | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  return typeof nav?.vibrate === 'function';
}

/** Vibre si le réglage est actif et si les mouvements ne sont pas réduits. Renvoie true si une vibration est demandée. */
export function buzz(kind: Buzz, enabled: boolean, reduced: boolean, nav: VibrateNav | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!enabled || reduced || !canVibrate(nav)) return false;
  try {
    return nav!.vibrate!(PATTERNS[kind]);
  } catch {
    return false;
  }
}
